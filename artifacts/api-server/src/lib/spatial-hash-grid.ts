export interface SpatiallyLocated {
  position: {
    x: number;
    z: number;
  };
}

interface CellCoordinate {
  x: number;
  z: number;
}

/**
 * Collision-safe X/Z broadphase index.
 *
 * Nested numeric maps avoid the coordinate wraparound caused by packing cell
 * coordinates into a 32-bit bit-shift key. Queries also filter candidates by
 * exact circular distance, so callers do not mistake a cell overlap for a hit.
 */
export class SpatialHashGrid<T extends SpatiallyLocated> {
  private readonly columns = new Map<number, Map<number, Set<T>>>();
  private readonly locations = new Map<T, CellCoordinate>();
  private readonly cellSize: number;
  private readonly maxCellsPerQuery: number;

  constructor(
    cellSize = 128,
    maxCellsPerQuery = 4_096,
  ) {
    this.cellSize = cellSize;
    this.maxCellsPerQuery = maxCellsPerQuery;
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new Error("cellSize must be a positive finite number.");
    }
    if (!Number.isInteger(maxCellsPerQuery) || maxCellsPerQuery < 1) {
      throw new Error("maxCellsPerQuery must be a positive integer.");
    }
  }

  get size(): number {
    return this.locations.size;
  }

  insert(item: T): void {
    if (this.locations.has(item)) {
      throw new Error("Spatial item is already indexed.");
    }
    const cell = this.cellFor(item.position.x, item.position.z);
    this.bucketFor(cell.x, cell.z, true)!.add(item);
    this.locations.set(item, cell);
  }

  update(item: T): void {
    const previousCell = this.locations.get(item);
    if (!previousCell) {
      this.insert(item);
      return;
    }

    const nextCell = this.cellFor(item.position.x, item.position.z);
    if (nextCell.x === previousCell.x && nextCell.z === previousCell.z) {
      return;
    }

    this.removeFromBucket(item, previousCell);
    this.bucketFor(nextCell.x, nextCell.z, true)!.add(item);
    this.locations.set(item, nextCell);
  }

  remove(item: T): boolean {
    const cell = this.locations.get(item);
    if (!cell) return false;
    this.removeFromBucket(item, cell);
    this.locations.delete(item);
    return true;
  }

  /**
   * Writes only items whose positions fall inside the requested circle.
   * Pass a reusable array to avoid allocating a new result buffer per query.
   */
  queryRadius(x: number, z: number, radius: number, out: T[]): number {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      !Number.isFinite(radius) ||
      radius < 0
    ) {
      throw new Error("Spatial query center and radius must be finite.");
    }

    const minCell = this.cellFor(x - radius, z - radius);
    const maxCell = this.cellFor(x + radius, z + radius);
    const width = maxCell.x - minCell.x + 1;
    const depth = maxCell.z - minCell.z + 1;
    const cellsToVisit = width * depth;
    if (
      !Number.isSafeInteger(cellsToVisit) ||
      cellsToVisit > this.maxCellsPerQuery
    ) {
      throw new RangeError("Spatial query exceeds the configured cell limit.");
    }

    out.length = 0;
    const radiusSquared = radius * radius;
    let count = 0;

    for (let cellX = minCell.x; cellX <= maxCell.x; cellX += 1) {
      for (let cellZ = minCell.z; cellZ <= maxCell.z; cellZ += 1) {
        const bucket = this.bucketFor(cellX, cellZ, false);
        if (!bucket) continue;

        for (const item of bucket) {
          const deltaX = item.position.x - x;
          const deltaZ = item.position.z - z;
          if (deltaX * deltaX + deltaZ * deltaZ <= radiusSquared) {
            out[count] = item;
            count += 1;
          }
        }
      }
    }

    out.length = count;
    return count;
  }

  clear(): void {
    this.columns.clear();
    this.locations.clear();
  }

  private cellFor(x: number, z: number): CellCoordinate {
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      throw new Error("Spatial position coordinates must be finite.");
    }
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    if (!Number.isSafeInteger(cellX) || !Number.isSafeInteger(cellZ)) {
      throw new RangeError("Spatial position is outside supported grid range.");
    }
    return { x: cellX, z: cellZ };
  }

  private bucketFor(
    cellX: number,
    cellZ: number,
    create: true,
  ): Set<T>;
  private bucketFor(
    cellX: number,
    cellZ: number,
    create: false,
  ): Set<T> | undefined;
  private bucketFor(
    cellX: number,
    cellZ: number,
    create: boolean,
  ): Set<T> | undefined {
    let column = this.columns.get(cellX);
    if (!column && create) {
      column = new Map<number, Set<T>>();
      this.columns.set(cellX, column);
    }

    let bucket = column?.get(cellZ);
    if (!bucket && create && column) {
      bucket = new Set<T>();
      column.set(cellZ, bucket);
    }
    return bucket;
  }

  private removeFromBucket(item: T, cell: CellCoordinate): void {
    const column = this.columns.get(cell.x);
    const bucket = column?.get(cell.z);
    if (!column || !bucket) return;

    bucket.delete(item);
    if (bucket.size === 0) {
      column.delete(cell.z);
      if (column.size === 0) this.columns.delete(cell.x);
    }
  }
}
