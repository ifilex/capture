import { MapData, TileType } from '../types/game';

export interface GridNode {
  col: number;
  row: number;
}

export class PathfindingGrid {
  private map: MapData;
  private cols: number;
  private rows: number;
  private tileSize: number;

  constructor(map: MapData) {
    this.map = map;
    this.cols = map.width;
    this.rows = map.height;
    this.tileSize = map.tileSize;
  }

  public isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    const tile = this.map.tiles[row]?.[col];
    // Wall (1), Steel (2), Water (4) are impassable obstacles
    return tile !== TileType.WALL && tile !== TileType.STEEL && tile !== TileType.WATER;
  }

  public getTileCost(col: number, row: number): number {
    const tile = this.map.tiles[row]?.[col];
    if (tile === TileType.MUD) return 3; // Mud slows down
    if (tile === TileType.BOOST) return 0.5; // Boost pads speed up
    if (tile === TileType.BUSH) return 0.9; // Bush provides stealth cover
    return 1;
  }

  public worldToGrid(x: number, y: number): GridNode {
    return {
      col: Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.tileSize))),
      row: Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.tileSize))),
    };
  }

  public gridToWorld(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  /**
   * Fast Breadth-First / Dijkstra pathfinding with terrain weighting
   */
  public findPath(startX: number, startY: number, targetX: number, targetY: number): Array<{ x: number; y: number }> {
    const start = this.worldToGrid(startX, startY);
    const target = this.worldToGrid(targetX, targetY);

    if (start.col === target.col && start.row === target.row) {
      return [{ x: targetX, y: targetY }];
    }

    // If target is inside a wall, find the nearest walkable neighbor
    let actualTarget = target;
    if (!this.isWalkable(target.col, target.row)) {
      const neighbors = this.getNeighbors(target.col, target.row);
      if (neighbors.length > 0) {
        actualTarget = neighbors[0];
      } else {
        return [{ x: targetX, y: targetY }];
      }
    }

    const key = (c: number, r: number) => `${c},${r}`;
    const startKey = key(start.col, start.row);
    const targetKey = key(actualTarget.col, actualTarget.row);

    const cameFrom = new Map<string, GridNode>();
    const costSoFar = new Map<string, number>();
    costSoFar.set(startKey, 0);

    // Simple priority queue using array
    const frontier: Array<{ node: GridNode; priority: number }> = [{ node: start, priority: 0 }];

    let reached = false;
    let iterations = 0;
    const maxIterations = 500; // Limit iterations for 60fps budget

    while (frontier.length > 0 && iterations++ < maxIterations) {
      // Pop lowest priority
      frontier.sort((a, b) => a.priority - b.priority);
      const current = frontier.shift()!.node;
      const currentKey = key(current.col, current.row);

      if (current.col === actualTarget.col && current.row === actualTarget.row) {
        reached = true;
        break;
      }

      const neighbors = this.getNeighbors(current.col, current.row);
      for (const next of neighbors) {
        const nextKey = key(next.col, next.row);
        const tileCost = this.getTileCost(next.col, next.row);
        const newCost = (costSoFar.get(currentKey) || 0) + tileCost;

        if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)!) {
          costSoFar.set(nextKey, newCost);
          const heuristic = Math.hypot(next.col - actualTarget.col, next.row - actualTarget.row);
          frontier.push({ node: next, priority: newCost + heuristic });
          cameFrom.set(nextKey, current);
        }
      }
    }

    if (!reached && cameFrom.size === 0) {
      return [{ x: targetX, y: targetY }];
    }

    // Reconstruct path
    const pathGrid: GridNode[] = [];
    let curr: GridNode | undefined = actualTarget;
    let currKey = targetKey;

    if (!cameFrom.has(currKey) && reached === false) {
      // Return straight line fallback if no full path
      return [{ x: targetX, y: targetY }];
    }

    while (curr && !(curr.col === start.col && curr.row === start.row)) {
      pathGrid.push(curr);
      curr = cameFrom.get(currKey);
      if (curr) currKey = key(curr.col, curr.row);
    }
    pathGrid.reverse();

    // Convert to world coordinates
    const worldPath = pathGrid.map(node => this.gridToWorld(node.col, node.row));

    // Smooth path by skipping unnecessary waypoints with clear line of sight
    const smoothed = this.smoothPath(startX, startY, worldPath);

    // Finally append the exact target location
    smoothed.push({ x: targetX, y: targetY });

    return smoothed;
  }

  private getNeighbors(col: number, row: number): GridNode[] {
    const results: GridNode[] = [];
    const dirs = [
      { c: 0, r: -1 }, // North
      { c: 0, r: 1 },  // South
      { c: -1, r: 0 }, // West
      { c: 1, r: 0 },  // East
    ];

    for (const d of dirs) {
      const nc = col + d.c;
      const nr = row + d.r;
      if (this.isWalkable(nc, nr)) {
        results.push({ col: nc, row: nr });
      }
    }
    return results;
  }

  /**
   * Raycast line of sight between points to eliminate jagged zig-zags
   */
  public hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / (this.tileSize / 2));
    if (steps <= 1) return true;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const checkX = x1 + (x2 - x1) * t;
      const checkY = y1 + (y2 - y1) * t;
      const grid = this.worldToGrid(checkX, checkY);
      if (!this.isWalkable(grid.col, grid.row)) {
        return false;
      }
    }
    return true;
  }

  private smoothPath(
    startX: number,
    startY: number,
    waypoints: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> {
    if (waypoints.length <= 1) return waypoints;

    const result: Array<{ x: number; y: number }> = [];
    let currentX = startX;
    let currentY = startY;
    let i = 0;

    while (i < waypoints.length) {
      // Look as far ahead as possible with direct line of sight
      let furthest = i;
      for (let j = Math.min(i + 3, waypoints.length - 1); j >= i; j--) {
        if (this.hasLineOfSight(currentX, currentY, waypoints[j].x, waypoints[j].y)) {
          furthest = j;
          break;
        }
      }

      result.push(waypoints[furthest]);
      currentX = waypoints[furthest].x;
      currentY = waypoints[furthest].y;
      i = furthest + 1;
    }

    return result;
  }
}
