import { Player, Team, Flag, Projectile, MapData } from '../types/game';
import { GAME_CONFIG } from './constants';
import { PathfindingGrid } from './pathfinding';

export type BotRole = 'sentinel' | 'interceptor' | 'striker' | 'escort';

export interface AiLearningModel {
  gamesAnalyzed: number;
  // Lane preferences (top: y < 220, mid: 220 <= y <= 420, bottom: y > 420)
  laneStats: { top: number; mid: number; bottom: number };
  // Combat habits
  dashCount: number;
  bushStealthSeconds: number;
  jukeCount: number;
  totalCombatSeconds: number;
  // Learned adaptations
  leadFactor: number; // 1.0 to 1.6
  preferredDefenseLane: 'top' | 'mid' | 'bottom';
  bushReconEnabled: boolean;
  antiRusherKiting: boolean;
  adaptationLevel: number; // 1 to 10
  lastLog: string;
}

const STORAGE_KEY = 'ctf95_ai_learning_model';

export const DEFAULT_AI_MODEL: AiLearningModel = {
  gamesAnalyzed: 0,
  laneStats: { top: 3, mid: 4, bottom: 3 },
  dashCount: 0,
  bushStealthSeconds: 0,
  jukeCount: 0,
  totalCombatSeconds: 0,
  leadFactor: 1.15,
  preferredDefenseLane: 'mid',
  bushReconEnabled: false,
  antiRusherKiting: false,
  adaptationLevel: 3,
  lastLog: 'Sistema de IA Neuronal Inicializado. Analizando patrones de juego tácticos...',
};

export class AiLearningSystem {
  private static instance: AiLearningSystem | null = null;
  public model: AiLearningModel;
  private currentMatchPlayerHistory: {
    lastVelX: number;
    lastVelY: number;
    laneSamples: Array<'top' | 'mid' | 'bottom'>;
    bushTime: number;
    dashesSeen: number;
    jukesSeen: number;
  };

  private constructor() {
    this.model = this.loadModel();
    this.currentMatchPlayerHistory = {
      lastVelX: 0,
      lastVelY: 0,
      laneSamples: [],
      bushTime: 0,
      dashesSeen: 0,
      jukesSeen: 0,
    };
  }

  public static getInstance(): AiLearningSystem {
    if (!AiLearningSystem.instance) {
      AiLearningSystem.instance = new AiLearningSystem();
    }
    return AiLearningSystem.instance;
  }

  private loadModel(): AiLearningModel {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...DEFAULT_AI_MODEL };
  }

  public saveModel() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.model));
    } catch {}
  }

  public resetMemory() {
    this.model = { ...DEFAULT_AI_MODEL };
    this.saveModel();
  }

  /**
   * Called periodically during match to monitor the human player's behavior
   */
  public observePlayer(player: Player, dt: number): string | null {
    if (player.isBot || player.health <= 0 || player.respawnTimer > 0) return null;

    let logMessage: string | null = null;

    // 1. Observe Lane
    let lane: 'top' | 'mid' | 'bottom' = 'mid';
    if (player.y < 220) lane = 'top';
    else if (player.y > 420) lane = 'bottom';
    else lane = 'mid';

    this.model.laneStats[lane] += dt;
    this.currentMatchPlayerHistory.laneSamples.push(lane);
    if (this.currentMatchPlayerHistory.laneSamples.length > 300) {
      this.currentMatchPlayerHistory.laneSamples.shift();
    }

    // Determine favorite lane
    const { top, mid, bottom } = this.model.laneStats;
    let favLane: 'top' | 'mid' | 'bottom' = 'mid';
    if (top >= mid && top >= bottom) favLane = 'top';
    else if (bottom >= mid && bottom >= top) favLane = 'bottom';

    if (favLane !== this.model.preferredDefenseLane) {
      this.model.preferredDefenseLane = favLane;
      const laneName = favLane === 'top' ? 'NORTE' : favLane === 'bottom' ? 'SUR' : 'CENTRAL';
      logMessage = `[IA ADAPTATIVA] Detectada ofensiva recurrente por carril ${laneName}. Reubicando centinela.`;
      this.model.lastLog = logMessage;
    }

    // 2. Observe Bush Stealth
    if (player.isStealthed) {
      this.model.bushStealthSeconds += dt;
      this.currentMatchPlayerHistory.bushTime += dt;
      if (this.model.bushStealthSeconds > 12 && !this.model.bushReconEnabled) {
        this.model.bushReconEnabled = true;
        logMessage = `[IA ADAPTATIVA] Jugador utiliza cobertura de arbustos con alta frecuencia. Desplegando fuego de reconocimiento.`;
        this.model.lastLog = logMessage;
      }
    }

    // 3. Observe Dashing
    if (player.isDashing) {
      this.model.dashCount += 1;
      this.currentMatchPlayerHistory.dashesSeen += 1;
      if (this.model.dashCount > 25 && !this.model.antiRusherKiting) {
        this.model.antiRusherKiting = true;
        logMessage = `[IA ADAPTATIVA] Jugador ejecuta táctica de asalto rápido con sprint. Activando retroceso y disparo de contención.`;
        this.model.lastLog = logMessage;
      }
    }

    // 4. Observe Juking (rapid directional changes under fire)
    const dot = this.currentMatchPlayerHistory.lastVelX * player.vx + this.currentMatchPlayerHistory.lastVelY * player.vy;
    if (dot < -0.3 && (Math.abs(player.vx) > 50 || Math.abs(player.vy) > 50)) {
      this.model.jukeCount += 1;
      this.currentMatchPlayerHistory.jukesSeen += 1;
      if (this.model.jukeCount % 15 === 0) {
        this.model.leadFactor = Math.min(1.55, this.model.leadFactor + 0.05);
        this.model.adaptationLevel = Math.min(10, this.model.adaptationLevel + 1);
        logMessage = `[IA ADAPTATIVA] Patrón de esquiva zig-zag identificado. Factor de intercepción balística elevado a ${(this.model.leadFactor * 100).toFixed(0)}%.`;
        this.model.lastLog = logMessage;
      }
    }
    this.currentMatchPlayerHistory.lastVelX = player.vx;
    this.currentMatchPlayerHistory.lastVelY = player.vy;

    return logMessage;
  }

  /**
   * Called at the end of a match to solidify learned weights
   */
  public finalizeMatch() {
    this.model.gamesAnalyzed += 1;
    this.model.adaptationLevel = Math.min(10, 3 + Math.floor(this.model.gamesAnalyzed * 0.8));
    this.saveModel();
  }
}

/**
 * Intelligent Bot Agent with Role-based Behavior & Pathfinding
 */
export class BotAgent {
  public bot: Player;
  public role: BotRole;
  private pathfinder: PathfindingGrid;
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathTarget: { x: number; y: number } | null = null;
  private lastPathcalcTime: number = 0;
  private shootCooldown: number = 0;
  private strafeDir: number = 1;
  private strafeTimer: number = 0;
  private aiLearning: AiLearningSystem;
  private difficulty: 'recruit' | 'veteran' | 'nightmare';

  constructor(
    bot: Player,
    role: BotRole,
    map: MapData,
    difficulty: 'recruit' | 'veteran' | 'nightmare' = 'veteran'
  ) {
    this.bot = bot;
    this.role = role;
    this.pathfinder = new PathfindingGrid(map);
    this.aiLearning = AiLearningSystem.getInstance();
    this.difficulty = difficulty;
  }

  public update(
    dt: number,
    allPlayers: Record<string, Player>,
    flags: { red: Flag; blue: Flag },
    map: MapData,
    onShoot: (x: number, y: number, angle: number) => void
  ) {
    if (this.bot.health <= 0 || this.bot.respawnTimer > 0) {
      this.bot.vx = 0;
      this.bot.vy = 0;
      return;
    }

    const enemyTeam: Team = this.bot.team === 'red' ? 'blue' : 'red';
    const ownFlag = flags[this.bot.team as 'red' | 'blue'];
    const enemyFlag = flags[enemyTeam as 'red' | 'blue'];

    // 1. Determine tactical destination based on role and match dynamics
    const destination = this.determineDestination(ownFlag, enemyFlag, allPlayers, map);

    // 2. Recalculate path periodically or when target shifts significantly
    const now = performance.now();
    const targetShift = !this.pathTarget || Math.hypot(destination.x - this.pathTarget.x, destination.y - this.pathTarget.y) > 48;
    const pathInterval = this.difficulty === 'nightmare' ? 250 : 450;

    if (now - this.lastPathcalcTime > pathInterval || targetShift || this.currentPath.length === 0) {
      this.lastPathcalcTime = now;
      this.pathTarget = destination;
      this.currentPath = this.pathfinder.findPath(this.bot.x, this.bot.y, destination.x, destination.y);
    }

    // 3. Follow path waypoints
    let moveDirX = 0;
    let moveDirY = 0;

    if (this.currentPath.length > 0) {
      const nextWaypoint = this.currentPath[0];
      const distToWaypoint = Math.hypot(nextWaypoint.x - this.bot.x, nextWaypoint.y - this.bot.y);

      if (distToWaypoint < 18) {
        this.currentPath.shift();
      }

      if (this.currentPath.length > 0) {
        const wp = this.currentPath[0];
        const dx = wp.x - this.bot.x;
        const dy = wp.y - this.bot.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) {
          moveDirX = dx / len;
          moveDirY = dy / len;
        }
      }
    }

    // 4. Combat Evasion & Strafing
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 0.5 + Math.random() * 0.7;
      this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    }

    // Find nearest visible enemy
    const nearestEnemy = this.findNearestEnemy(allPlayers);

    // If in active combat, mix forward movement with tactical strafe
    if (nearestEnemy && nearestEnemy.dist < 260) {
      // Perpendicular vector for strafing
      const combatAngle = Math.atan2(nearestEnemy.player.y - this.bot.y, nearestEnemy.player.x - this.bot.x);
      const strafeX = -Math.sin(combatAngle) * this.strafeDir;
      const strafeY = Math.cos(combatAngle) * this.strafeDir;

      // Anti-rusher kiting: If player rushes aggressively, bot backs up while firing
      if (this.aiLearning.model.antiRusherKiting && nearestEnemy.dist < 130 && !this.bot.isCarryingFlag) {
        moveDirX = -Math.cos(combatAngle);
        moveDirY = -Math.sin(combatAngle);
      } else if (!this.bot.isCarryingFlag) {
        moveDirX = moveDirX * 0.4 + strafeX * 0.6;
        moveDirY = moveDirY * 0.4 + strafeY * 0.6;
      }
    }

    // 5. Dash decisions
    const canDash = this.bot.stamina > 25;
    const shouldDash =
      canDash &&
      (this.bot.isCarryingFlag ||
        (nearestEnemy && nearestEnemy.dist < 160 && this.bot.health < 45) ||
        (this.difficulty === 'nightmare' && nearestEnemy && nearestEnemy.dist < 200));

    if (shouldDash) {
      this.bot.isDashing = true;
      this.bot.stamina = Math.max(0, this.bot.stamina - GAME_CONFIG.STAMINA_DRAIN_RATE * dt);
    } else {
      this.bot.isDashing = false;
      if (this.bot.stamina < this.bot.maxStamina) {
        this.bot.stamina = Math.min(this.bot.maxStamina, this.bot.stamina + GAME_CONFIG.STAMINA_RECOVERY_RATE * dt);
      }
    }

    // 6. Apply Movement Speed & Terrain modifiers
    const tileCol = Math.floor(this.bot.x / map.tileSize);
    const tileRow = Math.floor(this.bot.y / map.tileSize);
    const tile = map.tiles[tileRow]?.[tileCol];

    let speed = GAME_CONFIG.BASE_SPEED;
    if (this.bot.isCarryingFlag) speed = GAME_CONFIG.CARRIER_SPEED;
    if (this.bot.isDashing) speed = GAME_CONFIG.DASH_SPEED;
    if (tile === 5) speed = GAME_CONFIG.MUD_SPEED;
    if (tile === 6) speed = GAME_CONFIG.BOOST_SPEED;

    this.bot.isStealthed = tile === 3; // Bush stealth

    const targetSpeedX = moveDirX * speed;
    const targetSpeedY = moveDirY * speed;

    this.bot.vx = targetSpeedX;
    this.bot.vy = targetSpeedY;

    // Position integration with wall collision
    const nextX = this.bot.x + this.bot.vx * dt;
    const nextY = this.bot.y + this.bot.vy * dt;
    const nextCol = Math.floor(nextX / map.tileSize);
    const nextRow = Math.floor(nextY / map.tileSize);

    if (this.pathfinder.isWalkable(nextCol, tileRow)) {
      this.bot.x = Math.max(16, Math.min(map.width * map.tileSize - 16, nextX));
    }
    if (this.pathfinder.isWalkable(tileCol, nextRow)) {
      this.bot.y = Math.max(16, Math.min(map.height * map.tileSize - 16, nextY));
    }

    // 7. Aim & Shooting Logic with Ballistic Lead
    this.shootCooldown -= dt;

    if (nearestEnemy) {
      const aimAngle = this.calculatePredictiveAim(nearestEnemy.player);
      this.bot.angle = aimAngle;

      const fireRate = this.difficulty === 'nightmare' ? 0.24 : this.difficulty === 'veteran' ? 0.32 : 0.48;

      if (this.shootCooldown <= 0 && nearestEnemy.dist < 340) {
        // Line of sight check before pulling trigger
        if (this.pathfinder.hasLineOfSight(this.bot.x, this.bot.y, nearestEnemy.player.x, nearestEnemy.player.y)) {
          this.shootCooldown = fireRate;
          this.bot.ammo = Math.max(0, this.bot.ammo - 1);
          onShoot(
            this.bot.x + Math.cos(aimAngle) * 16,
            this.bot.y + Math.sin(aimAngle) * 16,
            aimAngle
          );
        }
      }
    } else if (moveDirX !== 0 || moveDirY !== 0) {
      this.bot.angle = Math.atan2(moveDirY, moveDirX);
    }
  }

  /**
   * High-Level Strategic Goal Selection
   */
  private determineDestination(
    ownFlag: Flag,
    enemyFlag: Flag,
    allPlayers: Record<string, Player>,
    map: MapData
  ): { x: number; y: number } {
    // 1. CARRIER RULE: If this bot is carrying enemy flag, sprint to home base!
    if (this.bot.isCarryingFlag) {
      return { x: ownFlag.baseX, y: ownFlag.baseY };
    }

    // 2. RECOVERY RULE: If own flag is stolen or dropped, high priority to recover
    if (!ownFlag.isHome) {
      if (ownFlag.carriedBy) {
        const carrier = allPlayers[ownFlag.carriedBy];
        if (carrier) {
          // Predictive Interception: Intercept carrier en route to their base
          const carrierEnemyFlag = flagsFromTeam(carrier.team, ownFlag, enemyFlag);
          const t = Math.hypot(carrier.x - carrierEnemyFlag.baseX, carrier.y - carrierEnemyFlag.baseY);
          if (t > 50 && (this.role === 'interceptor' || this.role === 'striker')) {
            // Cut off path halfway to their base
            return {
              x: (carrier.x + carrierEnemyFlag.baseX) / 2,
              y: (carrier.y + carrierEnemyFlag.baseY) / 2,
            };
          }
          return { x: carrier.x, y: carrier.y };
        }
      } else if (ownFlag.dropped) {
        return { x: ownFlag.x, y: ownFlag.y };
      }
    }

    // 3. SENTINEL / BASE GUARD: Holds choke point guarding the favorite player attack lane
    if (this.role === 'sentinel') {
      const preferredLane = this.aiLearning.model.preferredDefenseLane;
      let guardY = ownFlag.baseY;
      if (preferredLane === 'top') guardY = Math.max(120, ownFlag.baseY - 140);
      else if (preferredLane === 'bottom') guardY = Math.min(map.height * map.tileSize - 120, ownFlag.baseY + 140);

      // Guard point just outside the flag radius
      const guardOffset = this.bot.team === 'red' ? 90 : -90;
      return { x: ownFlag.baseX + guardOffset, y: guardY };
    }

    // 4. ESCORT / SUPPORT: Protect team flag carrier if an ally is carrying
    if (this.role === 'escort' && enemyFlag.carriedBy && enemyFlag.carriedBy !== this.bot.id) {
      const allyCarrier = allPlayers[enemyFlag.carriedBy];
      if (allyCarrier) {
        // Run slightly ahead of ally carrier
        return {
          x: allyCarrier.x + Math.cos(allyCarrier.angle) * 60,
          y: allyCarrier.y + Math.sin(allyCarrier.angle) * 60,
        };
      }
    }

    // 5. STRIKER / INFILTRATOR: Infiltrate enemy territory and take their flag!
    if (enemyFlag.isHome) {
      return { x: enemyFlag.baseX, y: enemyFlag.baseY };
    } else if (enemyFlag.dropped) {
      return { x: enemyFlag.x, y: enemyFlag.y };
    }

    // Default: patrol around mid map or enemy base
    return { x: enemyFlag.baseX, y: enemyFlag.baseY };
  }

  /**
   * Predictive Lead Aiming using ballistic geometry
   */
  private calculatePredictiveAim(target: Player): number {
    const dx = target.x - this.bot.x;
    const dy = target.y - this.bot.y;
    const dist = Math.hypot(dx, dy);

    if (this.difficulty === 'recruit') {
      // Recruit aims directly at target position with slight human inaccuracy
      return Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.18;
    }

    // Veteran and Nightmare: Calculate lead time
    const bulletSpeed = GAME_CONFIG.PROJECTILE_SPEED;
    const flightTime = dist / bulletSpeed;

    // Apply learned lead multiplier
    const leadMult = this.difficulty === 'nightmare' ? this.aiLearning.model.leadFactor : 1.1;

    let predictedX = target.x + target.vx * flightTime * leadMult;
    let predictedY = target.y + target.vy * flightTime * leadMult;

    // Account for learned dodge / zig-zag behavior
    if (this.difficulty === 'nightmare' && this.aiLearning.model.jukeCount > 10) {
      // Add slight predictive offset in perpendicular vector
      predictedX += -target.vy * 0.12;
      predictedY += target.vx * 0.12;
    }

    return Math.atan2(predictedY - this.bot.y, predictedX - this.bot.x);
  }

  private findNearestEnemy(allPlayers: Record<string, Player>): { player: Player; dist: number } | null {
    let nearest: { player: Player; dist: number } | null = null;

    for (const id in allPlayers) {
      const p = allPlayers[id];
      if (p.team !== this.bot.team && p.health > 0 && p.respawnTimer <= 0) {
        // If enemy is in bush and stealthed, only detect if close
        const dist = Math.hypot(p.x - this.bot.x, p.y - this.bot.y);
        if (p.isStealthed && dist > 110 && !this.aiLearning.model.bushReconEnabled) {
          continue; // Hidden in grass!
        }

        if (!nearest || dist < nearest.dist) {
          nearest = { player: p, dist };
        }
      }
    }
    return nearest;
  }
}

function flagsFromTeam(team: Team, redFlag: Flag, blueFlag: Flag): Flag {
  return team === 'red' ? redFlag : blueFlag;
}
