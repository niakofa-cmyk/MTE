import type { Position3 } from "./authoritative-match.ts";

export interface StaticAabb {
  min: Position3;
  max: Position3;
}

export interface HorizontalMoveResult {
  position: Position3;
  blockedX: boolean;
  blockedZ: boolean;
}

const DEFAULT_MAX_COLLIDERS = 4_096;
const DEFAULT_PLAYER_RADIUS = 0.35;
const DEFAULT_PLAYER_HEIGHT = 1.8;

/**
 * Bounded, server-owned static level geometry.
 *
 * This intentionally uses a bounded linear scan until real level data and
 * profiling justify a more complex broadphase. It is not populated by client
 * input and does not claim octree-scale performance.
 */
export class StaticWorldCollisionMap {
  private readonly colliders: StaticAabb[] = [];
  private readonly worldHalfExtent: number;
  private readonly maxColliders: number;

  constructor(
    worldHalfExtent: number,
    maxColliders = DEFAULT_MAX_COLLIDERS,
  ) {
    if (!Number.isFinite(worldHalfExtent) || worldHalfExtent <= 0) {
      throw new Error("worldHalfExtent must be a positive finite number.");
    }
    if (!Number.isInteger(maxColliders) || maxColliders < 1) {
      throw new Error("maxColliders must be a positive integer.");
    }
    this.worldHalfExtent = worldHalfExtent;
    this.maxColliders = maxColliders;
  }

  get size(): number {
    return this.colliders.length;
  }

  /**
   * Register validated level geometry from trusted server-side map data.
   * Values are copied and frozen so callers cannot mutate collision state.
   */
  addStaticBounds(bounds: StaticAabb): void {
    if (this.colliders.length >= this.maxColliders) {
      throw new Error("Static collision map capacity has been reached.");
    }
    if (!bounds || !bounds.min || !bounds.max) {
      throw new Error("AABB requires min and max coordinates.");
    }

    const { min, max } = bounds;
    const coordinates = [
      min.x,
      min.y,
      min.z,
      max.x,
      max.y,
      max.z,
    ];
    if (!coordinates.every(Number.isFinite)) {
      throw new Error("AABB coordinates must be finite.");
    }
    if (
      min.x >= max.x ||
      min.y >= max.y ||
      min.z >= max.z ||
      Math.abs(min.x) > this.worldHalfExtent ||
      Math.abs(max.x) > this.worldHalfExtent ||
      Math.abs(min.z) > this.worldHalfExtent ||
      Math.abs(max.z) > this.worldHalfExtent
    ) {
      throw new Error("AABB must have positive volume inside world bounds.");
    }

    this.colliders.push(
      Object.freeze({
        min: Object.freeze({ ...min }),
        max: Object.freeze({ ...max }),
      }),
    );
  }

  isPositionClear(
    position: Position3,
    radius = DEFAULT_PLAYER_RADIUS,
    height = DEFAULT_PLAYER_HEIGHT,
  ): boolean {
    this.validateBody(position, radius, height);
    return !this.colliders.some((bounds) =>
      this.overlapsBody(position, radius, height, bounds),
    );
  }

  /**
   * Resolve horizontal movement against AABBs in axis order. This prevents
   * tunneling through thin walls and allows sliding along the unblocked axis.
   */
  resolveHorizontalMovement(
    position: Position3,
    deltaX: number,
    deltaZ: number,
    radius = DEFAULT_PLAYER_RADIUS,
    height = DEFAULT_PLAYER_HEIGHT,
  ): HorizontalMoveResult {
    this.validateBody(position, radius, height);
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaZ)) {
      throw new Error("Movement delta must be finite.");
    }

    let x = position.x;
    let z = position.z;
    let blockedX = false;
    let blockedZ = false;
    let proposedX = x + deltaX;

    for (const bounds of this.colliders) {
      if (
        !this.overlapsVertical(position.y, height, bounds) ||
        z + radius <= bounds.min.z ||
        z - radius >= bounds.max.z
      ) {
        continue;
      }

      if (
        deltaX > 0 &&
        x + radius <= bounds.min.x &&
        proposedX + radius > bounds.min.x
      ) {
        proposedX = Math.min(proposedX, bounds.min.x - radius);
        blockedX = true;
      } else if (
        deltaX < 0 &&
        x - radius >= bounds.max.x &&
        proposedX - radius < bounds.max.x
      ) {
        proposedX = Math.max(proposedX, bounds.max.x + radius);
        blockedX = true;
      }
    }
    x = proposedX;

    let proposedZ = z + deltaZ;
    for (const bounds of this.colliders) {
      if (
        !this.overlapsVertical(position.y, height, bounds) ||
        x + radius <= bounds.min.x ||
        x - radius >= bounds.max.x
      ) {
        continue;
      }

      if (
        deltaZ > 0 &&
        z + radius <= bounds.min.z &&
        proposedZ + radius > bounds.min.z
      ) {
        proposedZ = Math.min(proposedZ, bounds.min.z - radius);
        blockedZ = true;
      } else if (
        deltaZ < 0 &&
        z - radius >= bounds.max.z &&
        proposedZ - radius < bounds.max.z
      ) {
        proposedZ = Math.max(proposedZ, bounds.max.z + radius);
        blockedZ = true;
      }
    }
    z = proposedZ;

    return {
      position: { x, y: position.y, z },
      blockedX,
      blockedZ,
    };
  }

  /**
   * Return the nearest ray/AABB hit distance, or null when unobstructed.
   * Direction is normalized internally; zero and non-finite rays are rejected.
   */
  traceRay(
    origin: Position3,
    direction: Position3,
    maxDistance: number,
  ): number | null {
    if (
      !this.isFinitePosition(origin) ||
      !this.isFinitePosition(direction) ||
      !Number.isFinite(maxDistance) ||
      maxDistance <= 0
    ) {
      throw new Error("Ray origin, direction, and range must be finite.");
    }
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (!Number.isFinite(length) || length === 0) {
      throw new Error("Ray direction must be non-zero.");
    }
    const dx = direction.x / length;
    const dy = direction.y / length;
    const dz = direction.z / length;

    let nearest: number | null = null;
    for (const bounds of this.colliders) {
      const distance = this.intersectRayAabb(
        origin,
        { x: dx, y: dy, z: dz },
        maxDistance,
        bounds,
      );
      if (distance !== null && (nearest === null || distance < nearest)) {
        nearest = distance;
      }
    }
    return nearest;
  }

  private validateBody(
    position: Position3,
    radius: number,
    height: number,
  ): void {
    if (
      !this.isFinitePosition(position) ||
      !Number.isFinite(radius) ||
      radius < 0 ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      throw new Error("Player body dimensions and position must be valid.");
    }
  }

  private isFinitePosition(position: Position3): boolean {
    return (
      Number.isFinite(position.x) &&
      Number.isFinite(position.y) &&
      Number.isFinite(position.z)
    );
  }

  private overlapsVertical(
    y: number,
    height: number,
    bounds: StaticAabb,
  ): boolean {
    return y < bounds.max.y && y + height > bounds.min.y;
  }

  private overlapsBody(
    position: Position3,
    radius: number,
    height: number,
    bounds: StaticAabb,
  ): boolean {
    return (
      this.overlapsVertical(position.y, height, bounds) &&
      position.x + radius > bounds.min.x &&
      position.x - radius < bounds.max.x &&
      position.z + radius > bounds.min.z &&
      position.z - radius < bounds.max.z
    );
  }

  private intersectRayAabb(
    origin: Position3,
    direction: Position3,
    maxDistance: number,
    bounds: StaticAabb,
  ): number | null {
    let near = 0;
    let far = maxDistance;

    if (direction.x === 0) {
      if (origin.x < bounds.min.x || origin.x > bounds.max.x) return null;
    } else {
      let axisNear = (bounds.min.x - origin.x) / direction.x;
      let axisFar = (bounds.max.x - origin.x) / direction.x;
      if (axisNear > axisFar) [axisNear, axisFar] = [axisFar, axisNear];
      near = Math.max(near, axisNear);
      far = Math.min(far, axisFar);
      if (near > far) return null;
    }

    if (direction.y === 0) {
      if (origin.y < bounds.min.y || origin.y > bounds.max.y) return null;
    } else {
      let axisNear = (bounds.min.y - origin.y) / direction.y;
      let axisFar = (bounds.max.y - origin.y) / direction.y;
      if (axisNear > axisFar) [axisNear, axisFar] = [axisFar, axisNear];
      near = Math.max(near, axisNear);
      far = Math.min(far, axisFar);
      if (near > far) return null;
    }

    if (direction.z === 0) {
      if (origin.z < bounds.min.z || origin.z > bounds.max.z) return null;
    } else {
      let axisNear = (bounds.min.z - origin.z) / direction.z;
      let axisFar = (bounds.max.z - origin.z) / direction.z;
      if (axisNear > axisFar) [axisNear, axisFar] = [axisFar, axisNear];
      near = Math.max(near, axisNear);
      far = Math.min(far, axisFar);
      if (near > far) return null;
    }

    return near <= maxDistance && far >= 0 ? near : null;
  }
}
