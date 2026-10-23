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
const SEARCH_SECONDS = 3.5;

export function stepEnemyMind(input: MindInput): MindOutput {
  let state = input.state;
  let age = Math.max(0, input.age);
  const dt = Math.max(0, input.dt);
  const lastX = input.seen || input.heard ? input.actorX : input.lastX;
  const lastZ = input.seen || input.heard ? input.actorZ : input.lastZ;
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
