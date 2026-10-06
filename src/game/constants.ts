export const GAME_CONFIG = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 640,
  TICK_RATE: 60,
  SERVER_TICK_RATE: 30,
  
  PLAYER_RADIUS: 14,
  BASE_SPEED: 165,
  DASH_SPEED: 290,
  CARRIER_SPEED: 145,
  MUD_SPEED: 85,
  BOOST_SPEED: 260,
  
  MAX_HEALTH: 100,
  MAX_STAMINA: 100,
  STAMINA_DRAIN_RATE: 45, // per second while dashing
  STAMINA_RECOVERY_RATE: 30, // per second while idle/walking
  
  MAX_AMMO: 12,
  AMMO_RELOAD_TIME: 1.2, // seconds
  FIRE_COOLDOWN: 0.22, // seconds between shots
  
  PROJECTILE_SPEED: 480,
  PROJECTILE_DAMAGE: 35,
  PROJECTILE_MAX_RANGE: 480,
  
  RESPAWN_TIME: 3.5, // seconds
  FLAG_RETURN_TIME: 15, // seconds dropped flag stays before auto-returning
  FLAG_TOUCH_RADIUS: 24,
  BASE_CAPTURE_RADIUS: 30,
  
  MATCH_DURATION_SECONDS: 300, // 5 minutes
  TARGET_CAPTURES_TO_WIN: 3,
};

export interface RankTierInfo {
  tier: string;
  minMMR: number;
  maxMMR: number;
  color: string;
  badge: string;
}

export const RANK_TIERS: RankTierInfo[] = [
  { tier: 'Recruit', minMMR: 0, maxMMR: 999, color: '#94a3b8', badge: '🔰' },
  { tier: 'Corporal', minMMR: 1000, maxMMR: 1199, color: '#38bdf8', badge: '🔷' },
  { tier: 'Sergeant', minMMR: 1200, maxMMR: 1399, color: '#4ade80', badge: '🎖️' },
  { tier: 'Lieutenant', minMMR: 1400, maxMMR: 1599, color: '#facc15', badge: '⭐' },
  { tier: 'Captain', minMMR: 1600, maxMMR: 1799, color: '#fb923c', badge: '⚡' },
  { tier: 'Major', minMMR: 1800, maxMMR: 1999, color: '#f87171', badge: '🔥' },
  { tier: 'Colonel', minMMR: 2000, maxMMR: 2299, color: '#c084fc', badge: '👑' },
  { tier: 'General', minMMR: 2300, maxMMR: 9999, color: '#f43f5e', badge: '🏆' },
];

export function getRankInfo(mmr: number): RankTierInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (mmr >= RANK_TIERS[i].minMMR) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export const DEDICATED_SERVERS_LIST = [
  {
    id: 'srv-us-east',
    name: 'US-East #01 [High-Tick]',
    region: 'us-east',
    location: 'Virginia, USA',
    ping: 18,
    playersCount: 6,
    maxPlayers: 8,
    currentMap: 'DOS Woods 1995',
    mode: 'ranked' as const,
    status: 'active' as const,
  },
  {
    id: 'srv-eu-central',
    name: 'EU-Central #01 [Competitive]',
    region: 'eu-central',
    location: 'Frankfurt, DE',
    ping: 32,
    playersCount: 4,
    maxPlayers: 8,
    currentMap: 'Divided Canyon',
    mode: 'ranked' as const,
    status: 'active' as const,
  },
  {
    id: 'srv-sa-brazil',
    name: 'SA-East #01 [Casual CTF]',
    region: 'sa-brazil',
    location: 'São Paulo, BR',
    ping: 45,
    playersCount: 8,
    maxPlayers: 8,
    currentMap: 'Cyber Fortress 95',
    mode: 'casual' as const,
    status: 'full' as const,
  },
  {
    id: 'srv-asia-tokyo',
    name: 'Asia-East #01 [Co-Op Bots]',
    region: 'asia-tokyo',
    location: 'Tokyo, JP',
    ping: 68,
    playersCount: 2,
    maxPlayers: 6,
    currentMap: 'DOS Woods 1995',
    mode: 'coop' as const,
    status: 'active' as const,
  },
];
