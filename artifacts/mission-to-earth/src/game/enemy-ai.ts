export type Mind = "patrol" | "suspicious" | "engage" | "investigate" | "search";

export type MindInput = {
  state: Mind;
  seen: boolean;
  heard: boolean;
  dt: number;
  age: number;
  lastX: number;
  lastZ: number;
  actorX: number;
  actorZ: number;
  heardX?: number;
  heardZ?: number;
};

export type MindOutput = {
  state: Mind;
  age: number;
  lastX: number;
  lastZ: number;
  shoot: boolean;
  investigate: boolean;
};

const SUSPICION_SECONDS = 0.45;
const INVESTIGATION_SECONDS = 4;
export const SEARCH_SECONDS = 10.8;

export function withinVisionCone(yaw: number, dx: number, dz: number, halfAngleDegrees = 72) {
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) return true;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const dot = (forwardX * dx + forwardZ * dz) / distance;
  return dot >= Math.cos((halfAngleDegrees * Math.PI) / 180);
}

export function canPerceiveTarget(
  yaw: number,
  dx: number,
  dz: number,
  range: number,
  hasLineOfSight: () => boolean,
  halfAngleDegrees = 72,
) {
  return Math.hypot(dx, dz) < range &&
    withinVisionCone(yaw, dx, dz, halfAngleDegrees) &&
    hasLineOfSight();
}

export function stepEnemyMind(input: MindInput): MindOutput {
  let state = input.state;
  let age = Math.max(0, input.age);
  const dt = Math.max(0, input.dt);
  const alertX = input.heardX ?? input.actorX;
  const alertZ = input.heardZ ?? input.actorZ;
  const lastX = input.seen ? input.actorX : input.heard ? alertX : input.lastX;
  const lastZ = input.seen ? input.actorZ : input.heard ? alertZ : input.lastZ;
  const enter = (next: Mind) => {
    state = next;
    age = 0;
  };

  if (input.seen) {
    if (state === "engage") {
      age += dt;
    } else if (state === "suspicious") {
      age += dt;
      if (age >= SUSPICION_SECONDS) enter("engage");
    } else {
      enter("suspicious");
    }
  } else {
    age += dt;

    if (state === "patrol" && input.heard) {
      enter("suspicious");
    } else if (state === "suspicious" || state === "engage") {
      enter("investigate");
    } else if (state === "search" && input.heard) {
      enter("investigate");
    } else if (state === "investigate" && age >= INVESTIGATION_SECONDS) {
      enter("search");
    } else if (state === "search" && age >= SEARCH_SECONDS) {
      enter("patrol");
    }
  }

  return {
    state,
    age,
    lastX,
    lastZ,
    shoot: state === "engage",
    investigate: state === "investigate" || state === "search",
  };
}
