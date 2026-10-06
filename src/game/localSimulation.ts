import { GameState, Player, Flag, Projectile, MapData, Team, GameMode } from '../types/game';
import { GAME_CONFIG } from './constants';
import { BotAgent, BotRole, AiLearningSystem } from './aiLearning';
import { soundManager } from '../audio/soundManager';

export interface LocalSimulationCallbacks {
  onScoreChange: (score: { red: number; blue: number }) => void;
  onMatchEnd: (winner: Team, stats: { captures: number; returns: number; tags: number; deaths: number }) => void;
  onScreenShake: (amount: number) => void;
  onAiLog: (log: string) => void;
  onRadioBark?: (sender: string, text: string, team: Team) => void;
}

export class LocalSimulationEngine {
  public gameState: GameState;
  public localPlayerId: string;
  public map: MapData;
  private botAgents: BotAgent[] = [];
  private callbacks: LocalSimulationCallbacks;
  private aiLearning: AiLearningSystem;
  private difficulty: 'recruit' | 'veteran' | 'nightmare';
  private observationTimer: number = 0;

  constructor(
    localPlayerId: string,
    playerName: string,
    playerTeam: 'red' | 'blue',
    map: MapData,
    mode: GameMode,
    difficulty: 'recruit' | 'veteran' | 'nightmare' = 'veteran',
    squadSize: 2 | 3 | 4 = 3,
    callbacks: LocalSimulationCallbacks
  ) {
    this.localPlayerId = localPlayerId;
    this.map = map;
    this.callbacks = callbacks;
    this.difficulty = difficulty;
    this.aiLearning = AiLearningSystem.getInstance();

    const redBase = map.redSpawn || { x: 3 * 32 + 16, y: 10 * 32 + 16 };
    const blueBase = map.blueSpawn || { x: 28 * 32 + 16, y: 10 * 32 + 16 };
    const redFlagPos = map.redFlagPos || redBase;
    const blueFlagPos = map.blueFlagPos || blueBase;

    // Initialize human player
    const spawnX = playerTeam === 'red' ? redBase.x : blueBase.x;
    const spawnY = playerTeam === 'red' ? redBase.y : blueBase.y;

    const humanPlayer: Player = {
      id: localPlayerId,
      name: playerName,
      team: playerTeam,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      angle: playerTeam === 'red' ? 0 : Math.PI,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      ammo: 12,
      maxAmmo: 12,
      isCarryingFlag: false,
      carryingTeamFlag: null,
      isDashing: false,
      isStealthed: false,
      isShooting: false,
      score: 0,
      kills: 0,
      deaths: 0,
      captures: 0,
      returns: 0,
      ping: 2, // Local 0-2ms latency
      platform: 'pc',
      isBot: false,
      rank: 'Operative',
      isSpeaking: false,
      respawnTimer: 0,
    };

    const playersRecord: Record<string, Player> = {
      [localPlayerId]: humanPlayer,
    };

    // Initialize Game State
    this.gameState = {
      roomId: 'local-vs-pc',
      roomName: 'Local PC Match',
      mode,
      serverRegion: 'local-60hz',
      score: { red: 0, blue: 0 },
      targetScore: GAME_CONFIG.TARGET_CAPTURES_TO_WIN,
      matchTimeRemaining: GAME_CONFIG.MATCH_DURATION_SECONDS,
      status: 'in_progress',
      winner: null,
      players: playersRecord,
      flags: {
        red: {
          team: 'red',
          x: redFlagPos.x,
          y: redFlagPos.y,
          baseX: redFlagPos.x,
          baseY: redFlagPos.y,
          isHome: true,
          carriedBy: null,
          dropped: false,
          dropTimer: 0,
        },
        blue: {
          team: 'blue',
          x: blueFlagPos.x,
          y: blueFlagPos.y,
          baseX: blueFlagPos.x,
          baseY: blueFlagPos.y,
          isHome: true,
          carriedBy: null,
          dropped: false,
          dropTimer: 0,
        },
      },
      projectiles: [],
      pickups: [],
      mines: [],
      map,
      killFeed: [],
      voiceSpeakers: [],
    };

    // Spawn intelligent AI Bots
    this.spawnBots(playerTeam, squadSize);
  }

  private spawnBots(playerTeam: 'red' | 'blue', squadSize: number) {
    const enemyTeam = playerTeam === 'red' ? 'blue' : 'red';
    const enemySpawn = enemyTeam === 'red' ? this.gameState.flags.red.baseX : this.gameState.flags.blue.baseX;
    const enemyBaseY = enemyTeam === 'red' ? this.gameState.flags.red.baseY : this.gameState.flags.blue.baseY;

    const allySpawn = playerTeam === 'red' ? this.gameState.flags.red.baseX : this.gameState.flags.blue.baseX;
    const allyBaseY = playerTeam === 'red' ? this.gameState.flags.red.baseY : this.gameState.flags.blue.baseY;

    const botTemplates = [
      { name: 'IA Centinela Delta', role: 'sentinel' as BotRole, rank: 'Major' },
      { name: 'IA Asaltante Vega', role: 'striker' as BotRole, rank: 'Colonel' },
      { name: 'IA Interceptador 95', role: 'interceptor' as BotRole, rank: 'Captain' },
      { name: 'IA Escolta Nexus', role: 'escort' as BotRole, rank: 'Lieutenant' },
    ];

    // Spawn Enemy Bots
    for (let i = 0; i < squadSize; i++) {
      const tmpl = botTemplates[i % botTemplates.length];
      const botId = `bot-enemy-${i}`;
      const botPlayer: Player = {
        id: botId,
        name: tmpl.name,
        team: enemyTeam,
        x: enemySpawn + (Math.random() - 0.5) * 60,
        y: enemyBaseY + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        angle: enemyTeam === 'red' ? 0 : Math.PI,
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        ammo: 12,
        maxAmmo: 12,
        isCarryingFlag: false,
        carryingTeamFlag: null,
        isDashing: false,
        isStealthed: false,
        isShooting: false,
        score: 0,
        kills: 0,
        deaths: 0,
        captures: 0,
        returns: 0,
        ping: 3,
        platform: 'pc',
        isBot: true,
        rank: tmpl.rank,
        isSpeaking: false,
        respawnTimer: 0,
      };

      this.gameState.players[botId] = botPlayer;
      this.botAgents.push(new BotAgent(botPlayer, tmpl.role, this.map, this.difficulty));
    }

    // Spawn Ally Bots (squadSize - 1 so human + allies = enemy team)
    for (let i = 0; i < squadSize - 1; i++) {
      const botId = `bot-ally-${i}`;
      const botPlayer: Player = {
        id: botId,
        name: `Aliado Bravo-${i + 1}`,
        team: playerTeam,
        x: allySpawn + (Math.random() - 0.5) * 60,
        y: allyBaseY + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        angle: playerTeam === 'red' ? 0 : Math.PI,
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        ammo: 12,
        maxAmmo: 12,
        isCarryingFlag: false,
        carryingTeamFlag: null,
        isDashing: false,
        isStealthed: false,
        isShooting: false,
        score: 0,
        kills: 0,
        deaths: 0,
        captures: 0,
        returns: 0,
        ping: 3,
        platform: 'pc',
        isBot: true,
        rank: 'Sergeant',
        isSpeaking: false,
        respawnTimer: 0,
      };

      this.gameState.players[botId] = botPlayer;
      const role: BotRole = i === 0 ? 'striker' : 'sentinel';
      this.botAgents.push(new BotAgent(botPlayer, role, this.map, this.difficulty));
    }
  }

  public update(dt: number) {
    if (this.gameState.status === 'ended') return;

    // Match Timer Countdown
    if (this.gameState.matchTimeRemaining > 0) {
      this.gameState.matchTimeRemaining = Math.max(0, this.gameState.matchTimeRemaining - dt);
      if (this.gameState.matchTimeRemaining <= 0) {
        this.endMatch();
        return;
      }
    }

    const now = Date.now();

    // 1. Observe Human Player with Adaptive AI Neural System
    const human = this.gameState.players[this.localPlayerId];
    if (human) {
      this.observationTimer += dt;
      if (this.observationTimer > 0.5) {
        this.observationTimer = 0;
        const newLog = this.aiLearning.observePlayer(human, 0.5);
        if (newLog) {
          this.callbacks.onAiLog(newLog);
          if (this.callbacks.onRadioBark) {
            this.callbacks.onRadioBark('IA Central', newLog, 'blue');
          }
        }
      }
    }

    // 2. Update Bots AI
    for (const agent of this.botAgents) {
      agent.update(dt, this.gameState.players, this.gameState.flags, this.map, (x, y, angle) => {
        this.spawnProjectile(agent.bot.id, agent.bot.team, x, y, angle);
      });
    }

    // 3. Update Respawns & Stamina for all players
    for (const id in this.gameState.players) {
      const p = this.gameState.players[id];
      if (p.respawnTimer > 0) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.health = p.maxHealth;
          p.stamina = p.maxStamina;
          p.ammo = p.maxAmmo;
          const spawnBase = p.team === 'red' ? this.gameState.flags.red : this.gameState.flags.blue;
          p.x = spawnBase.baseX + (Math.random() - 0.5) * 32;
          p.y = spawnBase.baseY + (Math.random() - 0.5) * 32;
        }
      }

      // Check Flag Pickup
      this.checkFlagInteraction(p);
    }

    // 4. Update Projectiles
    this.updateProjectiles(dt);

    // 5. Update Dropped Flag Timers
    for (const team of ['red', 'blue'] as const) {
      const flag = this.gameState.flags[team];
      if (flag.dropped) {
        flag.dropTimer -= dt;
        if (flag.dropTimer <= 0) {
          flag.isHome = true;
          flag.dropped = false;
          flag.x = flag.baseX;
          flag.y = flag.baseY;
          soundManager.playFlagReturned();
          this.addFeedItem('Base', 'Bandera', team, team, 'returned');
        }
      }
    }
  }

  public spawnProjectile(ownerId: string, team: Team, x: number, y: number, angle: number) {
    const owner = this.gameState.players[ownerId];
    if (owner && owner.ammo > 0) {
      owner.ammo = Math.max(0, owner.ammo - 1);
    }

    this.gameState.projectiles.push({
      id: `${Date.now()}-${Math.random()}`,
      ownerId,
      team,
      x,
      y,
      vx: Math.cos(angle) * GAME_CONFIG.PROJECTILE_SPEED,
      vy: Math.sin(angle) * GAME_CONFIG.PROJECTILE_SPEED,
      damage: GAME_CONFIG.PROJECTILE_DAMAGE,
      rangeLeft: GAME_CONFIG.PROJECTILE_MAX_RANGE,
    });
  }

  private updateProjectiles(dt: number) {
    const projectiles = this.gameState.projectiles;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      const stepDist = Math.hypot(proj.vx * dt, proj.vy * dt);
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.rangeLeft -= stepDist;

      // Check wall collision
      const col = Math.floor(proj.x / this.map.tileSize);
      const row = Math.floor(proj.y / this.map.tileSize);
      const tile = this.map.tiles[row]?.[col];

      if (
        proj.x < 16 ||
        proj.x > this.map.width * this.map.tileSize - 16 ||
        proj.y < 16 ||
        proj.y > this.map.height * this.map.tileSize - 16 ||
        proj.rangeLeft <= 0 ||
        tile === 1 || // Wall
        tile === 2    // Steel
      ) {
        projectiles.splice(i, 1);
        continue;
      }

      // Check player hits
      let hit = false;
      for (const id in this.gameState.players) {
        const p = this.gameState.players[id];
        if (p.team !== proj.team && p.health > 0 && p.respawnTimer <= 0) {
          const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
          if (dist < GAME_CONFIG.PLAYER_RADIUS + 4) {
            hit = true;
            p.health = Math.max(0, p.health - proj.damage);
            projectiles.splice(i, 1);

            soundManager.playTagHit();

            if (p.id === this.localPlayerId) {
              this.callbacks.onScreenShake(6);
            }

            if (p.health <= 0) {
              p.deaths++;
              p.respawnTimer = GAME_CONFIG.RESPAWN_TIME;
              soundManager.playPlayerEliminated();

              const killer = this.gameState.players[proj.ownerId];
              if (killer) {
                killer.kills++;
                killer.score += 100;
              }

              // Drop flag if carrying
              if (p.isCarryingFlag && p.carryingTeamFlag) {
                const flag = this.gameState.flags[p.carryingTeamFlag];
                flag.carriedBy = null;
                flag.dropped = true;
                flag.dropTimer = GAME_CONFIG.FLAG_RETURN_TIME;
                flag.x = p.x;
                flag.y = p.y;
                p.isCarryingFlag = false;
                p.carryingTeamFlag = null;
                soundManager.playFlagReturned();
              }

              this.addFeedItem(killer?.name || 'Desconocido', p.name, proj.team, p.team, 'tagged');
            }
            break;
          }
        }
      }

      if (hit) continue;
    }
  }

  private checkFlagInteraction(player: Player) {
    if (player.health <= 0 || player.respawnTimer > 0) return;

    const enemyTeam: Team = player.team === 'red' ? 'blue' : 'red';
    const enemyFlag = this.gameState.flags[enemyTeam as 'red' | 'blue'];
    const ownFlag = this.gameState.flags[player.team as 'red' | 'blue'];

    // 1. Pick up enemy flag
    if (!player.isCarryingFlag) {
      const distToEnemyFlag = Math.hypot(player.x - enemyFlag.x, player.y - enemyFlag.y);
      if (distToEnemyFlag < GAME_CONFIG.FLAG_TOUCH_RADIUS && !enemyFlag.carriedBy) {
        enemyFlag.carriedBy = player.id;
        enemyFlag.isHome = false;
        enemyFlag.dropped = false;
        player.isCarryingFlag = true;
        player.carryingTeamFlag = enemyTeam;
        soundManager.playFlagGrabbed();
        this.addFeedItem(player.name, 'Bandera Enemiga', player.team, enemyTeam, 'captured');
      }
    }

    // 2. Return own dropped flag
    if (ownFlag.dropped) {
      const distToOwn = Math.hypot(player.x - ownFlag.x, player.y - ownFlag.y);
      if (distToOwn < GAME_CONFIG.FLAG_TOUCH_RADIUS) {
        ownFlag.isHome = true;
        ownFlag.dropped = false;
        ownFlag.x = ownFlag.baseX;
        ownFlag.y = ownFlag.baseY;
        player.returns++;
        player.score += 150;
        soundManager.playFlagReturned();
        this.addFeedItem(player.name, 'Bandera Aliada', player.team, player.team, 'returned');
      }
    }

    // 3. Complete Capture at base
    if (player.isCarryingFlag && player.carryingTeamFlag) {
      const carriedFlag = this.gameState.flags[player.carryingTeamFlag];
      carriedFlag.x = player.x;
      carriedFlag.y = player.y;

      const distToBase = Math.hypot(player.x - ownFlag.baseX, player.y - ownFlag.baseY);
      if (distToBase < GAME_CONFIG.BASE_CAPTURE_RADIUS && ownFlag.isHome) {
        // Successful Capture!
        if (player.team === 'red') this.gameState.score.red++;
        else this.gameState.score.blue++;

        player.captures++;
        player.score += 300;

        soundManager.playFlagCaptured();

        // Reset enemy flag
        carriedFlag.isHome = true;
        carriedFlag.dropped = false;
        carriedFlag.carriedBy = null;
        carriedFlag.x = carriedFlag.baseX;
        carriedFlag.y = carriedFlag.baseY;

        player.isCarryingFlag = false;
        player.carryingTeamFlag = null;

        this.callbacks.onScoreChange(this.gameState.score);
        this.addFeedItem(player.name, 'PUNTO DE CAPTURA', player.team, carriedFlag.team, 'captured');

        // Check Match Win
        if (this.gameState.score[player.team as 'red' | 'blue'] >= this.gameState.targetScore) {
          this.endMatch(player.team);
        }
      }
    }
  }

  private addFeedItem(killer: string, victim: string, kTeam: Team, vTeam: Team, action: 'tagged' | 'captured' | 'returned') {
    this.gameState.killFeed.unshift({
      id: `${Date.now()}-${Math.random()}`,
      killerName: killer,
      victimName: victim,
      killerTeam: kTeam,
      victimTeam: vTeam,
      action,
      timestamp: Date.now(),
    });
    if (this.gameState.killFeed.length > 5) {
      this.gameState.killFeed.pop();
    }
  }

  public endMatch(forcedWinner?: Team) {
    this.gameState.status = 'ended';
    const winner = forcedWinner || (this.gameState.score.red > this.gameState.score.blue ? 'red' : this.gameState.score.blue > this.gameState.score.red ? 'blue' : null);
    this.gameState.winner = winner;

    this.aiLearning.finalizeMatch();

    const human = this.gameState.players[this.localPlayerId];
    const stats = human
      ? {
          captures: human.captures,
          returns: human.returns,
          tags: human.kills,
          deaths: human.deaths,
        }
      : { captures: 0, returns: 0, tags: 0, deaths: 0 };

    this.callbacks.onMatchEnd(winner || 'red', stats);
  }
}
