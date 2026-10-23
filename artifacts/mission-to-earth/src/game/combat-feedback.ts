export const DAMAGE_DIRECTIONS = ["front", "right", "back", "left"] as const;
export type DamageDirection = (typeof DAMAGE_DIRECTIONS)[number];

const HIT_MARKER_SECONDS = 0.32;
const DAMAGE_INDICATOR_SECONDS = 0.72;

export class CombatFeedback {
  private hitRemaining = 0;
  private hitWasHeadshot = false;
  private damageRemaining: Record<DamageDirection, number> = {
    front: 0,
    right: 0,
    back: 0,
    left: 0,
  };

  update(dt: number) {
    const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.hitRemaining = Math.max(0, this.hitRemaining - elapsed);
    for (const direction of DAMAGE_DIRECTIONS) {
      this.damageRemaining[direction] = Math.max(
        0,
        this.damageRemaining[direction] - elapsed,
      );
    }
  }

  markHit(headshot: boolean) {
    this.hitRemaining = HIT_MARKER_SECONDS;
    this.hitWasHeadshot = headshot;
  }

  markDamage(direction: DamageDirection | null) {
    if (direction) this.damageRemaining[direction] = DAMAGE_INDICATOR_SECONDS;
  }

  get hitOpacity() {
    return this.hitRemaining / HIT_MARKER_SECONDS;
  }

  get headshot() {
    return this.hitRemaining > 0 && this.hitWasHeadshot;
  }

  damageOpacity(direction: DamageDirection) {
    return this.damageRemaining[direction] / DAMAGE_INDICATOR_SECONDS;
  }
}

export function damageDirection(
  playerX: number,
  playerZ: number,
  yaw: number,
  sourceX: number,
  sourceZ: number,
): DamageDirection | null {
  const dx = sourceX - playerX;
  const dz = sourceZ - playerZ;
  if (Math.hypot(dx, dz) < 1e-6) return null;

  const forward = -Math.sin(yaw) * dx - Math.cos(yaw) * dz;
  const right = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
  const bearing = Math.atan2(right, forward);
  const absoluteBearing = Math.abs(bearing);

  if (absoluteBearing <= Math.PI / 4) return "front";
  if (absoluteBearing >= (3 * Math.PI) / 4) return "back";
  return bearing > 0 ? "right" : "left";
}
