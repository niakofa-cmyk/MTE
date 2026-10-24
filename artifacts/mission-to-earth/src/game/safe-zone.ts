export type ZonePoint = { x: number; z: number };
export type ZoneVelocity = { x: number; z: number };

const MAX_ZONE_SPEED = 10;

export function shouldCollapseSafeZone(
  landed: boolean,
  beaconRaised: boolean,
  elapsedSinceLanding: number,
  graceSeconds = 18,
): boolean {
  return (
    landed &&
    beaconRaised &&
    Number.isFinite(elapsedSinceLanding) &&
    Number.isFinite(graceSeconds) &&
    graceSeconds >= 0 &&
    elapsedSinceLanding > graceSeconds
  );
}

/**
 * Advance the safe-zone center toward its objective only as fast as the player
 * is making progress in that direction. This prevents objective changes from
 * making the zone outrun a player who has not yet had a chance to move.
 */
export function advanceSafeZoneCenter(
  center: ZonePoint,
  target: ZonePoint,
  playerVelocity: ZoneVelocity,
  deltaTime: number,
  maxSpeed = MAX_ZONE_SPEED,
): ZonePoint {
  if (
    ![
      center.x,
      center.z,
      target.x,
      target.z,
      playerVelocity.x,
      playerVelocity.z,
      deltaTime,
      maxSpeed,
    ].every(Number.isFinite)
  ) {
    return { x: center.x, z: center.z };
  }

  const dx = target.x - center.x;
  const dz = target.z - center.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 1e-6 || deltaTime <= 0 || maxSpeed <= 0) {
    return { x: center.x, z: center.z };
  }

  const directionX = dx / distance;
  const directionZ = dz / distance;
  const playerProgressSpeed = Math.max(
    0,
    playerVelocity.x * directionX + playerVelocity.z * directionZ,
  );
  const speed = Math.min(MAX_ZONE_SPEED, maxSpeed, playerProgressSpeed);
  const step = Math.min(distance, speed * deltaTime);

  return {
    x: center.x + directionX * step,
    z: center.z + directionZ * step,
  };
}
