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

export function stepEnemyMind(input: MindInput): MindOutput {
  const heardOrSeen = input.seen || input.heard;
  let state = input.state;
  let age = input.age + input.dt;
  const lastX = heardOrSeen ? input.actorX : input.lastX;
  const lastZ = heardOrSeen ? input.actorZ : input.lastZ;

  if (input.seen) {
    state = age < 0.45 && state !== "engage" ? "suspicious" : "engage";
  } else if (state === "suspicious") {
    state = "investigate";
    age = 0;
  } else if (state === "engage" && !input.seen) {
    state = "investigate";
    age = 0;
  } else if (state === "investigate" && age > 4) {
    state = "search";
    age = 0;
  } else if (state === "search" && age > 3.5) {
    state = "patrol";
    age = 0;
  } else if (state === "patrol" && input.heard) {
    state = "suspicious";
    age = 0;
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
