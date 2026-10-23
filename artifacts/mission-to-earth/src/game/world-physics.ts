export type CollisionBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type CollisionBox = CollisionBounds & {
  h: number;
  alive: boolean;
};

export type DestructibleBox = CollisionBox & {
  destructible: boolean;
  hp: number;
};

export type Position2D = { x: number; z: number };

export const RADIUS = 0.42;
export const STEP = 0.58;

export function xzHit(x: number, z: number, radius: number, box: CollisionBounds) {
  return (
    x + radius > box.minX &&
    x - radius < box.maxX &&
    z + radius > box.minZ &&
    z - radius < box.maxZ
  );
}

export function movementBlocked<T extends CollisionBox>(
  x: number,
  z: number,
  feetY: number,
  boxes: readonly T[],
) {
  for (const box of boxes) {
    if (!box.alive || box.h <= feetY + STEP) continue;
    if (xzHit(x, z, RADIUS, box)) return box;
  }
  return null;
}

export function floorHeight<T extends CollisionBox>(
  x: number,
  z: number,
  feetY: number,
  boxes: readonly T[],
) {
  let floor = 0;
  for (const box of boxes) {
    if (!box.alive || box.h > feetY + STEP + 0.02) continue;
    if (xzHit(x, z, 0.1, box)) floor = Math.max(floor, box.h);
  }
  return floor;
}

export function separateAabbOverlap(
  x: number,
  z: number,
  radius: number,
  box: CollisionBounds,
): Position2D {
  if (!xzHit(x, z, radius, box)) return { x, z };

  const left = x - (box.minX - radius);
  const right = box.maxX + radius - x;
  const south = z - (box.minZ - radius);
  const north = box.maxZ + radius - z;
  const penetration = Math.min(left, right, south, north);
  if (penetration === left) return { x: box.minX - radius - 0.02, z };
  if (penetration === right) return { x: box.maxX + radius + 0.02, z };
  if (penetration === south) return { x, z: box.minZ - radius - 0.02 };
  return { x, z: box.maxZ + radius + 0.02 };
}

/** Applies damage only; the engine owns the visual/audio effects of breaking a box. */
export function applyCoverDamage(box: DestructibleBox, damage: number) {
  if (!box.alive || !box.destructible || !Number.isFinite(damage) || damage <= 0) {
    return false;
  }
  box.hp -= damage;
  return box.hp <= 0;
}
