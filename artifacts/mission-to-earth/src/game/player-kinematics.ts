import type { OpId } from "@/game/content";

export const STANDARD_SPRINT_MULTIPLIER = 1.5;
export const TOUCH_SPRINT_MULTIPLIER = 2.2;

export type MovementSpeedInput = {
  operator: OpId;
  weaponMove: number;
  inUnravel: boolean;
  raActive: boolean;
  crouched: boolean;
  sliding: boolean;
  sprinting: boolean;
  sprintMultiplier?: number;
  aiming: boolean;
  dropping: boolean;
};

export function maxMovementSpeed(input: MovementSpeedInput) {
  let max = 5.6 * input.weaponMove;
  if (input.operator === "bodhi") max *= 1.12;
  if (input.operator === "ananda") max *= 1.08;
  if (input.operator === "khensu" || input.operator === "nefret") max *= 0.92;
  if (input.inUnravel) max *= 1.5;
  if (input.raActive) max *= 0.55;
  if (input.crouched && !input.sliding) max *= 0.56;
  else if (input.sprinting) {
    const requestedMultiplier = input.sprintMultiplier;
    const sprintMultiplier =
      typeof requestedMultiplier === "number" && Number.isFinite(requestedMultiplier)
        ? Math.min(TOUCH_SPRINT_MULTIPLIER, Math.max(1, requestedMultiplier))
        : STANDARD_SPRINT_MULTIPLIER;
    max *= sprintMultiplier;
  }
  if (input.aiming) max *= 0.62;
  if (input.dropping) max = 17;
  return max;
}

export function boostSlideVelocity(vx: number, vz: number) {
  return { vx: vx * 1.3, vz: vz * 1.3 };
}

export type HorizontalMotionInput = {
  vx: number;
  vz: number;
  wishX: number;
  wishZ: number;
  maxSpeed: number;
  acceleration: number;
  dt: number;
  sliding: boolean;
  slideDrag: number;
  slideSteer: number;
};

export function stepHorizontalVelocity(input: HorizontalMotionInput) {
  if (input.sliding) {
    const decay = Math.exp(-input.slideDrag * input.dt);
    return {
      vx: input.vx * decay + input.wishX * input.slideSteer * input.dt,
      vz: input.vz * decay + input.wishZ * input.slideSteer * input.dt,
    };
  }

  const blend = 1 - Math.exp(-input.acceleration * input.dt);
  return {
    vx: input.vx + (input.wishX * input.maxSpeed - input.vx) * blend,
    vz: input.vz + (input.wishZ * input.maxSpeed - input.vz) * blend,
  };
}

export function stepVerticalVelocity(
  vy: number,
  dt: number,
  gravity: number,
  wallRunning: boolean,
  jumpHeld: boolean,
) {
  let nextVy = vy;
  let nextGravity = gravity;
  if (wallRunning) {
    nextGravity *= 0.3;
    nextVy = Math.max(nextVy, -2);
  }
  nextVy -= nextGravity * dt;
  if (jumpHeld && nextVy < -11) nextVy = -11;
  return nextVy;
}
