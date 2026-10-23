export type NavigationPoint = { x: number; z: number };
export type CanStand = (x: number, z: number) => boolean;

const CELL_SIZE = 2;
const MAX_SNAP_CELLS = 4;

function key(x: number, z: number, width: number) {
  return z * width + x;
}

function octile(x: number, z: number, goalX: number, goalZ: number) {
  const dx = Math.abs(goalX - x);
  const dz = Math.abs(goalZ - z);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

function segmentIsClear(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  canStand: CanStand,
) {
  const distance = Math.hypot(x1 - x0, z1 - z0);
  const samples = Math.max(1, Math.ceil(distance / 0.5));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    if (!canStand(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false;
  }
  return true;
}

function nearestOpenCell(
  x: number,
  z: number,
  origin: number,
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  canStand: CanStand,
) {
  const centerX = Math.round((x - origin) / CELL_SIZE);
  const centerZ = Math.round((z - origin) / CELL_SIZE);
  for (let radius = 0; radius <= MAX_SNAP_CELLS; radius++) {
    let best: { x: number; z: number; distance: number } | null = null;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const cellX = centerX + dx;
        const cellZ = centerZ + dz;
        if (cellX < minX || cellX > maxX || cellZ < minZ || cellZ > maxZ) continue;
        if (cellX < 0 || cellX >= width || cellZ < 0 || cellZ >= height) continue;
        const worldX = origin + cellX * CELL_SIZE;
        const worldZ = origin + cellZ * CELL_SIZE;
        if (!canStand(worldX, worldZ)) continue;
        if (!segmentIsClear(x, z, worldX, worldZ, canStand)) continue;
        const distance = Math.hypot(worldX - x, worldZ - z);
        if (!best || distance < best.distance) best = { x: cellX, z: cellZ, distance };
      }
    }
    if (best) return best;
  }
  return null;
}

type OpenNode = { id: number; x: number; z: number; score: number };

function pushHeap(heap: OpenNode[], node: OpenNode) {
  let index = heap.length;
  heap.push(node);
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (heap[parent]!.score <= node.score) break;
    heap[index] = heap[parent]!;
    index = parent;
  }
  heap[index] = node;
}

function popHeap(heap: OpenNode[]) {
  const first = heap[0];
  const last = heap.pop();
  if (!first || !last || heap.length === 0) return first;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    if (left >= heap.length) break;
    const child = right < heap.length && heap[right]!.score < heap[left]!.score ? right : left;
    if (heap[child]!.score >= last.score) break;
    heap[index] = heap[child]!;
    index = child;
  }
  heap[index] = last;
  return first;
}

export function findNavigationPath(
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
  canStand: CanStand,
  worldLimit: number,
): NavigationPoint[] | null {
  if (segmentIsClear(startX, startZ, goalX, goalZ, canStand)) {
    return [{ x: goalX, z: goalZ }];
  }

  const origin = -worldLimit;
  const width = Math.ceil((worldLimit * 2) / CELL_SIZE) + 1;
  const height = width;
  const padding = 26;
  const minCellX = Math.max(0, Math.floor((Math.min(startX, goalX) - padding - origin) / CELL_SIZE));
  const maxCellX = Math.min(width - 1, Math.ceil((Math.max(startX, goalX) + padding - origin) / CELL_SIZE));
  const minCellZ = Math.max(0, Math.floor((Math.min(startZ, goalZ) - padding - origin) / CELL_SIZE));
  const maxCellZ = Math.min(height - 1, Math.ceil((Math.max(startZ, goalZ) + padding - origin) / CELL_SIZE));

  const start = nearestOpenCell(
    startX, startZ, origin, width, height, minCellX, maxCellX, minCellZ, maxCellZ, canStand,
  );
  const goal = nearestOpenCell(
    goalX, goalZ, origin, width, height, minCellX, maxCellX, minCellZ, maxCellZ, canStand,
  );
  if (!start || !goal) return null;

  const total = width * height;
  const costs = new Float64Array(total);
  costs.fill(Number.POSITIVE_INFINITY);
  const parents = new Int32Array(total);
  parents.fill(-1);
  const closed = new Uint8Array(total);
  const startId = key(start.x, start.z, width);
  const goalId = key(goal.x, goal.z, width);
  costs[startId] = 0;
  const open: OpenNode[] = [];
  pushHeap(open, { id: startId, x: start.x, z: start.z, score: octile(start.x, start.z, goal.x, goal.z) });

  const directions = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2],
  ] as const;
  const passable = new Map<number, boolean>();
  const isOpen = (cellX: number, cellZ: number) => {
    if (cellX < minCellX || cellX > maxCellX || cellZ < minCellZ || cellZ > maxCellZ) return false;
    const id = key(cellX, cellZ, width);
    const cached = passable.get(id);
    if (cached !== undefined) return cached;
    const openCell = canStand(origin + cellX * CELL_SIZE, origin + cellZ * CELL_SIZE);
    passable.set(id, openCell);
    return openCell;
  };

  let found = false;
  let expanded = 0;
  while (open.length && expanded < 12000) {
    const current = popHeap(open)!;
    if (closed[current.id]) continue;
    if (current.id === goalId) {
      found = true;
      break;
    }
    closed[current.id] = 1;
    expanded++;

    for (const [dx, dz, moveCost] of directions) {
      const nextX = current.x + dx;
      const nextZ = current.z + dz;
      if (!isOpen(nextX, nextZ)) continue;
      if (dx !== 0 && dz !== 0 && (!isOpen(current.x + dx, current.z) || !isOpen(current.x, current.z + dz))) {
        continue;
      }
      if (!segmentIsClear(
        origin + current.x * CELL_SIZE,
        origin + current.z * CELL_SIZE,
        origin + nextX * CELL_SIZE,
        origin + nextZ * CELL_SIZE,
        canStand,
      )) continue;
      const nextId = key(nextX, nextZ, width);
      if (closed[nextId]) continue;
      const nextCost = costs[current.id]! + moveCost;
      if (nextCost >= costs[nextId]!) continue;
      costs[nextId] = nextCost;
      parents[nextId] = current.id;
      pushHeap(open, {
        id: nextId,
        x: nextX,
        z: nextZ,
        score: nextCost + octile(nextX, nextZ, goal.x, goal.z),
      });
    }
  }

  if (!found) return null;
  const reversed: NavigationPoint[] = [];
  for (let id = goalId; id !== startId; id = parents[id]!) {
    if (id < 0 || parents[id] < 0) return null;
    const cellX = id % width;
    const cellZ = Math.floor(id / width);
    reversed.push({ x: origin + cellX * CELL_SIZE, z: origin + cellZ * CELL_SIZE });
  }
  reversed.reverse();

  if (reversed.length) {
    const end = reversed[reversed.length - 1]!;
    if (segmentIsClear(end.x, end.z, goalX, goalZ, canStand)) reversed.push({ x: goalX, z: goalZ });
  }
  return reversed;
}
