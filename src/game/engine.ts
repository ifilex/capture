import { GameState, Player, Flag, Projectile, TileType, MapData } from '../types/game';
import { GAME_CONFIG } from './constants';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private screenShake: number = 0;
  private animFrame: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false; // Authentic pixel art rendering
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  public addScreenShake(amount: number) {
    this.screenShake = Math.min(this.screenShake + amount, 14);
  }

  public spawnSparks(x: number, y: number, color: string, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 2,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
      });
    }
  }

  public spawnDashDust(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        color: '#94a3b8',
        size: 3 + Math.random() * 3,
        life: 0.3,
        maxLife: 0.3,
      });
    }
  }

  public updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 20 * dt);
    }
    this.animFrame += dt * 8;
  }

  public render(
    gameState: GameState,
    localPlayerId: string,
    showCRT: boolean = true
  ) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const map = gameState.map;
    const localPlayer = gameState.players[localPlayerId];

    // Screen shake offset
    ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Draw Ground / Background
    ctx.fillStyle = '#1e293b'; // Fallback
    ctx.fillRect(0, 0, w, h);

    // Render Map Tiles
    this.renderTiles(ctx, map);

    // 2. Render Flag Bases & Flags
    this.renderFlag(ctx, gameState.flags.red, 'red');
    this.renderFlag(ctx, gameState.flags.blue, 'blue');

    // 3. Render Particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.floor(p.x - p.size / 2), Math.floor(p.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    // 4. Render Projectiles
    for (const proj of gameState.projectiles) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.fillStyle = proj.team === 'red' ? '#ef4444' : '#38bdf8';
      // Retro glowing tracer bullet
      ctx.shadowColor = proj.team === 'red' ? '#f87171' : '#60a5fa';
      ctx.shadowBlur = 6;
      ctx.fillRect(-4, -2, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -1, 4, 2);
      ctx.restore();
    }

    // 5. Render Players
    const playersList = Object.values(gameState.players);
    // Sort players so lower Y renders on top for depth
    playersList.sort((a, b) => a.y - b.y);

    for (const p of playersList) {
      if (p.health <= 0 || p.respawnTimer > 0) continue;

      // Stealth logic: if stealthed in bush, check if visible to local player
      let opacity = 1.0;
      if (p.isStealthed) {
        if (localPlayer && p.team === localPlayer.team) {
          opacity = 0.45; // Teammates see semi-transparent
        } else if (localPlayer) {
          // Enemies only see if very close or local player also in same bush
          const dist = Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y);
          if (dist > 50 && !p.isShooting) {
            continue; // Hidden completely in bush!
          }
          opacity = 0.55;
        }
      }

      this.renderPlayer(ctx, p, p.id === localPlayerId, opacity);
    }

    // 6. Bushes Overlay: Redraw bush tops over players for authentic foliage depth!
    this.renderBushTops(ctx, map);

    ctx.restore(); // restore screen shake

    // 7. Render Minimap in top-right corner
    this.renderMinimap(ctx, gameState, localPlayerId);
  }

  private renderTiles(ctx: CanvasRenderingContext2D, map: MapData) {
    const ts = map.tileSize || 32;
    const cycle = Math.floor(this.animFrame) % 4;

    for (let r = 0; r < map.height; r++) {
      for (let c = 0; c < map.width; c++) {
        const tile = map.tiles[r]?.[c] ?? TileType.EMPTY;
        const x = c * ts;
        const y = r * ts;

        // Ground Grass background for all
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1b3b22' : '#17331d';
        ctx.fillRect(x, y, ts, ts);

        switch (tile) {
          case TileType.WALL: {
            // Retro brick ruin wall
            ctx.fillStyle = '#78350f';
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
            // Brick mortar lines
            ctx.fillStyle = '#451a03';
            ctx.fillRect(x, y + 10, ts, 2);
            ctx.fillRect(x, y + 21, ts, 2);
            ctx.fillRect(x + 16, y, 2, 10);
            ctx.fillRect(x + 8, y + 10, 2, 11);
            ctx.fillRect(x + 24, y + 10, 2, 11);
            break;
          }
          case TileType.STEEL: {
            // Armored Steel block
            ctx.fillStyle = '#334155';
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = '#475569';
            ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
            // Rivets
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(x + 4, y + 4, 3, 3);
            ctx.fillRect(x + ts - 7, y + 4, 3, 3);
            ctx.fillRect(x + 4, y + ts - 7, 3, 3);
            ctx.fillRect(x + ts - 7, y + ts - 7, 3, 3);
            break;
          }
          case TileType.WATER: {
            // Flowing pixel river
            ctx.fillStyle = '#0369a1';
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = '#38bdf8';
            const offset = (c * 7 + cycle * 4) % ts;
            ctx.fillRect(x + offset, y + 6, 8, 2);
            ctx.fillRect(x + ((offset + 14) % ts), y + 18, 10, 2);
            ctx.fillRect(x + ((offset + 6) % ts), y + 26, 6, 2);
            break;
          }
          case TileType.MUD: {
            // Mud slow-down terrain
            ctx.fillStyle = '#451a03';
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = '#713f12';
            ctx.fillRect(x + 4, y + 6, 8, 4);
            ctx.fillRect(x + 18, y + 14, 10, 6);
            break;
          }
          case TileType.BOOST: {
            // Speed Boost Pad with cycling arrows
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(x, y, ts, ts);
            ctx.fillStyle = cycle % 2 === 0 ? '#4ade80' : '#22c55e';
            // Arrow chevrons
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 16);
            ctx.lineTo(x + 16, y + 8);
            ctx.lineTo(x + 26, y + 16);
            ctx.lineTo(x + 26, y + 22);
            ctx.lineTo(x + 16, y + 14);
            ctx.lineTo(x + 6, y + 22);
            ctx.fill();
            break;
          }
          case TileType.MINE: {
            // Landmine
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 7, 0, Math.PI * 2);
            ctx.fill();
            // Blinking red sensor
            ctx.fillStyle = cycle % 2 === 0 ? '#ef4444' : '#7f1d1d';
            ctx.beginPath();
            ctx.arc(x + 16, y + 16, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case TileType.RED_BASE: {
            // Red team base markings
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(x, y, ts, ts);
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
            break;
          }
          case TileType.BLUE_BASE: {
            // Blue team base markings
            ctx.fillStyle = '#082f49';
            ctx.fillRect(x, y, ts, ts);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, ts - 4, ts - 4);
            break;
          }
          case TileType.AMMO_SPAWN: {
            // Ammo Box
            ctx.fillStyle = '#15803d';
            ctx.fillRect(x + 6, y + 8, 20, 16);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(x + 11, y + 12, 10, 8);
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 15, y + 13, 2, 6);
            break;
          }
          case TileType.HEALTH_SPAWN: {
            // Medkit
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(x + 6, y + 8, 20, 16);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 14, y + 11, 4, 10);
            ctx.fillRect(x + 11, y + 14, 10, 4);
            break;
          }
        }
      }
    }
  }

  // Draw Bushes on top so players can tuck inside for cover!
  private renderBushTops(ctx: CanvasRenderingContext2D, map: MapData) {
    const ts = map.tileSize || 32;
    for (let r = 0; r < map.height; r++) {
      for (let c = 0; c < map.width; c++) {
        if (map.tiles[r]?.[c] === TileType.BUSH) {
          const x = c * ts;
          const y = r * ts;
          ctx.fillStyle = '#15803d';
          // 4 overlapping foliage circles
          ctx.beginPath();
          ctx.arc(x + 10, y + 12, 9, 0, Math.PI * 2);
          ctx.arc(x + 22, y + 12, 8, 0, Math.PI * 2);
          ctx.arc(x + 16, y + 22, 9, 0, Math.PI * 2);
          ctx.arc(x + 16, y + 16, 7, 0, Math.PI * 2);
          ctx.fill();

          // Leaf highlights
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x + 8, y + 8, 4, 3);
          ctx.fillRect(x + 20, y + 9, 4, 3);
          ctx.fillRect(x + 14, y + 19, 4, 3);
        }
      }
    }
  }

  private renderFlag(ctx: CanvasRenderingContext2D, flag: Flag, team: 'red' | 'blue') {
    // 1. Draw Base Socket Pole Stand
    ctx.save();
    ctx.translate(flag.baseX, flag.baseY);
    ctx.fillStyle = team === 'red' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, GAME_CONFIG.FLAG_TOUCH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = team === 'red' ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Base pedestal
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();

    // 2. If flag is not carried, render the actual flag at its current position
    if (!flag.carriedBy) {
      ctx.save();
      ctx.translate(flag.x, flag.y);

      // Dropped alert indicator
      if (flag.dropped) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        // Flashing text
        ctx.fillStyle = '#facc15';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(flag.dropTimer)}s`, 0, -22);
      }

      // Pole
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2, -18, 3, 22);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-3, -20, 5, 3); // top finial

      // Waving cloth
      const wave = Math.sin(this.animFrame) * 3;
      ctx.fillStyle = team === 'red' ? '#dc2626' : '#2563eb';
      ctx.beginPath();
      ctx.moveTo(1, -19);
      ctx.lineTo(16 + wave, -15);
      ctx.lineTo(13 + wave, -8);
      ctx.lineTo(1, -9);
      ctx.closePath();
      ctx.fill();

      // Flag emblem / star
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4 + wave * 0.4, -15, 4, 4);

      ctx.restore();
    }
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    opacity: number
  ) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(player.x, player.y);

    // Dashing trail / dust effect
    if (player.isDashing) {
      this.spawnDashDust(player.x, player.y);
    }

    // Local Player Ring Highlighter
    if (isLocal) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Voice speaking aura indicator
    if (player.isSpeaking) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body rotation to aim angle
    ctx.save();
    ctx.rotate(player.angle);

    // Weapon barrel
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(8, -2, 12, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(10, -1, 8, 2);

    // Hands / Arms
    ctx.fillStyle = player.team === 'red' ? '#b91c1c' : '#1d4ed8';
    ctx.fillRect(2, -9, 8, 4);
    ctx.fillRect(2, 5, 8, 4);

    // Soldier Helmet & Body
    const mainColor = player.team === 'red' ? '#ef4444' : '#3b82f6';
    const darkColor = player.team === 'red' ? '#991b1b' : '#1e3a8a';
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Visor / Faceplate
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2, -4, 6, 8);
    ctx.fillStyle = '#38bdf8'; // Visor glint
    ctx.fillRect(4, -3, 3, 2);

    // Backpack / Flag mount
    ctx.fillStyle = darkColor;
    ctx.fillRect(-10, -5, 4, 10);

    ctx.restore(); // restore angle

    // If carrying flag, draw mounted flag waving behind soldier
    if (player.isCarryingFlag && player.carryingTeamFlag) {
      const carriedTeam = player.carryingTeamFlag;
      ctx.save();
      const wave = Math.sin(this.animFrame * 1.5) * 4;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-14, -18, 3, 16); // pole
      ctx.fillStyle = carriedTeam === 'red' ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-11, -18);
      ctx.lineTo(-2 + wave, -14);
      ctx.lineTo(-4 + wave, -7);
      ctx.lineTo(-11, -9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Overhead HUD: Name, Rank Badge, Health & Stamina Bar
    const hudY = -22;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';

    // Name + Rank Icon
    ctx.fillStyle = isLocal ? '#facc15' : '#ffffff';
    ctx.fillText(`${player.name}`, 0, hudY);

    // Health Bar
    const barW = 26;
    const barH = 3;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-barW / 2, hudY + 4, barW, barH);
    const healthPercent = Math.max(0, player.health / player.maxHealth);
    ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#facc15' : '#ef4444';
    ctx.fillRect(-barW / 2, hudY + 4, barW * healthPercent, barH);

    // Stamina Bar (for local player or carrier)
    if (isLocal) {
      const staminaPercent = Math.max(0, player.stamina / 100);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-barW / 2, hudY + 8, barW * staminaPercent, 2);
    }

    ctx.restore();
  }

  private renderMinimap(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    localPlayerId: string
  ) {
    const map = gameState.map;
    const miniW = 140;
    const miniH = 88;
    const miniX = this.canvas.width - miniW - 12;
    const miniY = 12;

    ctx.save();
    // Semi-transparent CRT Radar background
    ctx.fillStyle = 'rgba(11, 15, 20, 0.85)';
    ctx.fillRect(miniX, miniY, miniW, miniH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(miniX, miniY, miniW, miniH);

    const scaleX = miniW / (map.width * map.tileSize);
    const scaleY = miniH / (map.height * map.tileSize);

    // Draw Bases on minimap
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(
      miniX + (gameState.flags.red.baseX - 16) * scaleX,
      miniY + (gameState.flags.red.baseY - 16) * scaleY,
      6,
      6
    );

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(
      miniX + (gameState.flags.blue.baseX - 16) * scaleX,
      miniY + (gameState.flags.blue.baseY - 16) * scaleY,
      6,
      6
    );

    // Draw Flags
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(
      miniX + gameState.flags.red.x * scaleX,
      miniY + gameState.flags.red.y * scaleY,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(
      miniX + gameState.flags.blue.x * scaleX,
      miniY + gameState.flags.blue.y * scaleY,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw Players
    const local = gameState.players[localPlayerId];
    for (const p of Object.values(gameState.players)) {
      if (p.health <= 0 || p.respawnTimer > 0) continue;
      // Stealth check
      if (p.isStealthed && local && p.team !== local.team) continue;

      ctx.fillStyle = p.id === localPlayerId ? '#facc15' : p.team === 'red' ? '#ef4444' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(miniX + p.x * scaleX, miniY + p.y * scaleY, p.id === localPlayerId ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
