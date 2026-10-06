export type Team = 'red' | 'blue' | 'rogue';

export type Platform = 'pc' | 'console' | 'mobile';

export type GameMode = 'ranked' | 'casual' | 'coop' | 'custom' | 'vs_ai';

export interface Player {
  id: string;
  name: string;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  maxAmmo: number;
  isCarryingFlag: boolean;
  carryingTeamFlag: Team | null;
  isDashing: boolean;
  isStealthed: boolean;
  isShooting: boolean;
  score: number;
  kills: number;
  deaths: number;
  captures: number;
  returns: number;
  ping: number;
  platform: Platform;
  isBot: boolean;
  rank: string;
  isSpeaking: boolean;
  respawnTimer: number;
  lastPingTime?: number;
}

export interface Flag {
  team: Team;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  isHome: boolean;
  carriedBy: string | null;
  dropped: boolean;
  dropTimer: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  rangeLeft: number;
}

export interface PickupItem {
  id: string;
  type: 'ammo' | 'health' | 'speed';
  x: number;
  y: number;
  respawnTimer: number;
}

export interface Landmine {
  id: string;
  team: Team;
  x: number;
  y: number;
  triggered: boolean;
}

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  STEEL = 2,
  BUSH = 3,
  WATER = 4,
  MUD = 5,
  BOOST = 6,
  MINE = 7,
  RED_BASE = 8,
  BLUE_BASE = 9,
  RED_FLAG = 10,
  BLUE_FLAG = 11,
  AMMO_SPAWN = 12,
  HEALTH_SPAWN = 13,
}

export interface MapData {
  id: string;
  name: string;
  author: string;
  description: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][]; // [row][col]
  redSpawn: { x: number; y: number };
  blueSpawn: { x: number; y: number };
  redFlagPos: { x: number; y: number };
  blueFlagPos: { x: number; y: number };
  createdAt?: string;
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  victimName: string;
  killerTeam: Team;
  victimTeam: Team;
  action: 'tagged' | 'captured' | 'returned';
  timestamp: number;
}

export interface GameState {
  roomId: string;
  roomName: string;
  mode: GameMode;
  serverRegion: string;
  score: { red: number; blue: number };
  targetScore: number;
  matchTimeRemaining: number;
  status: 'waiting' | 'in_progress' | 'ended';
  winner: Team | null;
  players: Record<string, Player>;
  flags: { red: Flag; blue: Flag };
  projectiles: Projectile[];
  pickups: PickupItem[];
  mines: Landmine[];
  map: MapData;
  killFeed: KillFeedItem[];
  voiceSpeakers: string[];
}

export interface PlayerProfile {
  id: string;
  username: string;
  syncCode: string;
  mmr: number;
  rankTier: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  flagsCaptured: number;
  flagsReturned: number;
  tags: number;
  deaths: number;
  accuracy: number;
  platform: Platform;
  avatar: string;
  equippedColor: string;
  savedMaps: MapData[];
  lastSynced: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  mmr: number;
  rankTier: string;
  wins: number;
  losses: number;
  flagsCaptured: number;
  flagsReturned: number;
  winRate: number;
  platform: Platform;
  avatar: string;
}

export interface DedicatedServerInfo {
  id: string;
  name: string;
  region: string;
  location: string;
  ping: number;
  playersCount: number;
  maxPlayers: number;
  currentMap: string;
  mode: GameMode;
  status: 'active' | 'full' | 'lobby';
}

export interface TacticalRadioBark {
  id: string;
  text: string;
  team: Team;
  sender: string;
  timestamp: number;
}
