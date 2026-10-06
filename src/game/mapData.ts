import { MapData, TileType } from '../types/game';

// 32 columns x 20 rows standard retro arena
export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 20;
export const TILE_SIZE = 32; // 32x32 pixels per tile (1024 x 640 total game canvas)

export function createEmptyTileGrid(w = MAP_WIDTH, h = MAP_HEIGHT): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      // Outer border walls
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        row.push(TileType.STEEL);
      } else {
        row.push(TileType.EMPTY);
      }
    }
    grid.push(row);
  }
  return grid;
}

export const MAP_CLASSIC_1995: MapData = {
  id: 'classic-1995',
  name: 'DOS Woods 1995',
  author: 'Carr Retro Classic',
  description: 'Symmetric woodland battlefield featuring a river crossing, tactical bushes, and ruin walls.',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tileSize: TILE_SIZE,
  redSpawn: { x: 3 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  blueSpawn: { x: 28 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  redFlagPos: { x: 2 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  blueFlagPos: { x: 29 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  tiles: (() => {
    const g = createEmptyTileGrid();

    // Red Base Area
    g[9][2] = TileType.RED_BASE;
    g[10][2] = TileType.RED_FLAG;
    g[11][2] = TileType.RED_BASE;
    g[9][1] = TileType.WALL;
    g[11][1] = TileType.WALL;

    // Blue Base Area
    g[9][29] = TileType.BLUE_BASE;
    g[10][29] = TileType.BLUE_FLAG;
    g[11][29] = TileType.BLUE_BASE;
    g[9][30] = TileType.WALL;
    g[11][30] = TileType.WALL;

    // River in the center (column 15 & 16), with bridges at top, middle, bottom
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      if (y === 3 || y === 4 || y === 9 || y === 10 || y === 15 || y === 16) {
        // Bridges (ground with mud or boost)
        if (y === 9 || y === 10) {
          g[y][15] = TileType.BOOST;
          g[y][16] = TileType.BOOST;
        } else {
          g[y][15] = TileType.EMPTY;
          g[y][16] = TileType.EMPTY;
        }
      } else {
        g[y][15] = TileType.WATER;
        g[y][16] = TileType.WATER;
      }
    }

    // Stealth Bushes along the flanks
    for (let x = 6; x <= 12; x++) {
      g[3][x] = TileType.BUSH;
      g[4][x] = TileType.BUSH;
      g[15][x] = TileType.BUSH;
      g[16][x] = TileType.BUSH;
    }
    for (let x = 19; x <= 25; x++) {
      g[3][x] = TileType.BUSH;
      g[4][x] = TileType.BUSH;
      g[15][x] = TileType.BUSH;
      g[16][x] = TileType.BUSH;
    }

    // Defensive Ruin Walls
    // Left defense
    g[7][7] = TileType.WALL;
    g[8][7] = TileType.WALL;
    g[12][7] = TileType.WALL;
    g[13][7] = TileType.WALL;

    // Right defense
    g[7][24] = TileType.WALL;
    g[8][24] = TileType.WALL;
    g[12][24] = TileType.WALL;
    g[13][24] = TileType.WALL;

    // Center bunker walls
    g[8][13] = TileType.WALL;
    g[11][13] = TileType.WALL;
    g[8][18] = TileType.WALL;
    g[11][18] = TileType.WALL;

    // Pickups
    g[10][8] = TileType.AMMO_SPAWN;
    g[10][23] = TileType.AMMO_SPAWN;
    g[2][15] = TileType.HEALTH_SPAWN;
    g[17][16] = TileType.HEALTH_SPAWN;

    // Mines at flank approach
    g[5][10] = TileType.MINE;
    g[14][21] = TileType.MINE;

    return g;
  })(),
};

export const MAP_CANYON: MapData = {
  id: 'divided-canyon',
  name: 'Divided Canyon',
  author: 'Carr 1995 Archive',
  description: 'High-octane tactical map with narrow chokepoints and speed boost jump pads.',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tileSize: TILE_SIZE,
  redSpawn: { x: 3 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  blueSpawn: { x: 28 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  redFlagPos: { x: 2 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  blueFlagPos: { x: 29 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  tiles: (() => {
    const g = createEmptyTileGrid();

    // Bases
    g[9][2] = TileType.RED_BASE;
    g[10][2] = TileType.RED_FLAG;
    g[11][2] = TileType.RED_BASE;

    g[9][29] = TileType.BLUE_BASE;
    g[10][29] = TileType.BLUE_FLAG;
    g[11][29] = TileType.BLUE_BASE;

    // Central ravine (Steel & Water)
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      if (y < 6 || y > 13) {
        g[y][15] = TileType.WALL;
        g[y][16] = TileType.WALL;
      } else if (y === 9 || y === 10) {
        g[y][15] = TileType.BOOST;
        g[y][16] = TileType.BOOST;
      } else {
        g[y][15] = TileType.MUD;
        g[y][16] = TileType.MUD;
      }
    }

    // Canyon ridges
    for (let x = 6; x <= 10; x++) {
      g[6][x] = TileType.WALL;
      g[13][x] = TileType.WALL;
    }
    for (let x = 21; x <= 25; x++) {
      g[6][x] = TileType.WALL;
      g[13][x] = TileType.WALL;
    }

    // Stealth patches
    for (let y = 7; y <= 12; y++) {
      g[y][11] = TileType.BUSH;
      g[y][20] = TileType.BUSH;
    }

    // Pickups
    g[3][15] = TileType.AMMO_SPAWN;
    g[16][16] = TileType.AMMO_SPAWN;
    g[10][5] = TileType.HEALTH_SPAWN;
    g[10][26] = TileType.HEALTH_SPAWN;

    return g;
  })(),
};

export const MAP_CYBER_FORTRESS: MapData = {
  id: 'cyber-fortress',
  name: 'Cyber Fortress 95',
  author: 'Sector 7 Operative',
  description: 'Fortified military complex with steel barriers, landmine fields, and tight corridors.',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tileSize: TILE_SIZE,
  redSpawn: { x: 3 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  blueSpawn: { x: 28 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  redFlagPos: { x: 2 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  blueFlagPos: { x: 29 * TILE_SIZE + 16, y: 10 * TILE_SIZE + 16 },
  tiles: (() => {
    const g = createEmptyTileGrid();

    // Base flag rooms
    g[9][2] = TileType.RED_BASE;
    g[10][2] = TileType.RED_FLAG;
    g[11][2] = TileType.RED_BASE;
    for (let y = 8; y <= 12; y++) {
      g[y][4] = TileType.STEEL;
    }
    g[10][4] = TileType.EMPTY; // door

    g[9][29] = TileType.BLUE_BASE;
    g[10][29] = TileType.BLUE_FLAG;
    g[11][29] = TileType.BLUE_BASE;
    for (let y = 8; y <= 12; y++) {
      g[y][27] = TileType.STEEL;
    }
    g[10][27] = TileType.EMPTY; // door

    // Internal labyrinth
    for (let x = 8; x <= 23; x += 3) {
      g[4][x] = TileType.WALL;
      g[5][x] = TileType.WALL;
      g[14][x] = TileType.WALL;
      g[15][x] = TileType.WALL;
    }

    // Center arena
    g[9][14] = TileType.STEEL;
    g[9][17] = TileType.STEEL;
    g[11][14] = TileType.STEEL;
    g[11][17] = TileType.STEEL;
    g[10][15] = TileType.AMMO_SPAWN;
    g[10][16] = TileType.HEALTH_SPAWN;

    // Danger zone
    g[7][15] = TileType.MINE;
    g[13][16] = TileType.MINE;

    // Bushes
    for (let y = 8; y <= 12; y++) {
      g[y][8] = TileType.BUSH;
      g[y][23] = TileType.BUSH;
    }

    return g;
  })(),
};

export const PRESET_MAPS: MapData[] = [
  MAP_CLASSIC_1995,
  MAP_CANYON,
  MAP_CYBER_FORTRESS,
];

// Map Validation
export function validateMap(map: MapData): { valid: boolean; error?: string } {
  if (!map.name || map.name.trim().length === 0) {
    return { valid: false, error: 'Map must have a valid title.' };
  }
  if (map.width < 16 || map.height < 12) {
    return { valid: false, error: 'Map dimensions too small (min 16x12).' };
  }

  let hasRedFlag = false;
  let hasBlueFlag = false;

  for (let r = 0; r < map.height; r++) {
    for (let c = 0; c < map.width; c++) {
      const t = map.tiles[r]?.[c];
      if (t === TileType.RED_FLAG) hasRedFlag = true;
      if (t === TileType.BLUE_FLAG) hasBlueFlag = true;
    }
  }

  if (!hasRedFlag) {
    return { valid: false, error: 'Map is missing a RED Flag Stand.' };
  }
  if (!hasBlueFlag) {
    return { valid: false, error: 'Map is missing a BLUE Flag Stand.' };
  }

  return { valid: true };
}

// File export and download
export function exportMapToFile(map: MapData) {
  const jsonStr = JSON.stringify(map, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = map.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `${safeName || 'custom_map'}.ctf95.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parse imported JSON string
export function parseMapFromString(jsonStr: string): MapData {
  const data = JSON.parse(jsonStr);
  const validation = validateMap(data);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid map file format');
  }
  return data as MapData;
}
