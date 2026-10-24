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

export type RaycastBox = CollisionBox & {
  destructible?: boolean;
  tag?: string;
  reinforced?: boolean;
};

export type Position2D = { x: number; z: number };

export const RADIUS = 0.42;
export const STEP = 0.58;
const DOOR_AIM_PADDING_X = 0.22;
const DOOR_AIM_PADDING_TOP = 0.28;

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

function rayBoxDistance(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  box: CollisionBox,
  maxDistance: number,
  paddingX = 0,
  paddingTop = 0,
) {
  if (!box.alive || !Number.isFinite(maxDistance) || maxDistance <= 0) return null;

  const min = [box.minX - paddingX, 0, box.minZ];
  const max = [box.maxX + paddingX, box.h + paddingTop, box.maxZ];
  const o = [origin.x, origin.y, origin.z];
  const d = [direction.x, direction.y, direction.z];
  let tmin = 0;
  let tmax = maxDistance;

  for (let i = 0; i < 3; i++) {
    const di = d[i]!;
    const oi = o[i]!;
    if (!Number.isFinite(di) || !Number.isFinite(oi)) return null;
    if (Math.abs(di) < 1e-8) {
      if (oi < min[i]! || oi > max[i]!) return null;
      continue;
    }

    let t1 = (min[i]! - oi) / di;
    let t2 = (max[i]! - oi) / di;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }

  return tmin > 0.04 && tmin <= maxDistance ? tmin : null;
}

/**
 * Finds the first physical solid on a shot ray. Door aim padding is only
 * considered when it is still in front of every other physical blocker.
 */
export function firstSolidRayHit<T extends RaycastBox>(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  boxes: readonly T[],
  maxDistance: number,
  ignored: T | null = null,
) {
  let nearest: { box: T; distance: number } | null = null;
  let forgivingDoor: { box: T; distance: number } | null = null;

  for (const box of boxes) {
    if (!box.alive || box === ignored) continue;

    const distance = rayBoxDistance(origin, direction, box, maxDistance);
    if (distance !== null && (!nearest || distance < nearest.distance)) {
      nearest = { box, distance };
    }

    if (box.tag !== "door" || !box.destructible || box.reinforced) continue;
    const paddedDistance = rayBoxDistance(
      origin,
      direction,
      box,
      maxDistance,
      DOOR_AIM_PADDING_X,
      DOOR_AIM_PADDING_TOP,
    );
    if (paddedDistance !== null && (!forgivingDoor || paddedDistance < forgivingDoor.distance)) {
      forgivingDoor = { box, distance: paddedDistance };
    }
  }

  if (
    forgivingDoor &&
    (!nearest ||
      nearest.box === forgivingDoor.box ||
      forgivingDoor.distance < nearest.distance - 1e-4)
  ) {
    return forgivingDoor;
  }

  return nearest;
}

/** Applies damage only; the engine owns the visual/audio effects of breaking a box. */
export function applyCoverDamage(box: DestructibleBox, damage: number) {
  if (!box.alive || !box.destructible || !Number.isFinite(damage) || damage <= 0) {
    return false;
  }
  box.hp -= damage;
  return box.hp <= 0;
}
