export type MissionPhase = "INFILTRATION" | "BREACH" | "ESCORT_UPRISING" | "EXTRACTION";

export type Pace = {
  phase: MissionPhase;
  stress: number;
  accuracy: number;
  panic: boolean;
};

export type DebrisBit = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
};

/** One shared seed so every viewer of a breach sees the same rubble. No per-chunk net payload. */
export function seedRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function paceMission(input: {
  freed: number;
  beacon: boolean;
  nearGate: boolean;
  hp: number;
  stress: number;
}): Pace {
  let phase: MissionPhase = "INFILTRATION";
  if (input.beacon) phase = "EXTRACTION";
  else if (input.freed > 0) phase = "ESCORT_UPRISING";
  else if (input.nearGate) phase = "BREACH";

  let stress = input.stress;
  if (input.hp < 40) stress = Math.min(1, stress + 0.05);
  else stress = Math.max(phase === "INFILTRATION" ? 0.08 : 0.28, stress - 0.02);
  if (phase === "ESCORT_UPRISING") stress = Math.max(stress, 0.56);
  if (phase === "EXTRACTION") stress = Math.max(stress, 0.66);

  const panic = stress > 0.55;
  return { phase, stress, accuracy: panic ? 0.85 : 1, panic };
}

export const CRITICAL_MASS = 85;

/** Local authority for the coil. The client gauge is a view of this number, not the source of it. */
export function dischargeReady(solar: number, ultCd: number) {
  return solar >= CRITICAL_MASS && ultCd <= 0.05;
}

export function inBlastCone(
  ox: number,
  oz: number,
  fx: number,
  fz: number,
  px: number,
  pz: number,
  range: number,
) {
  const dx = px - ox;
  const dz = pz - oz;
  const distance = Math.hypot(dx, dz);
  if (distance > range || distance < 0.2) return false;
  return (dx * fx + dz * fz) / distance >= Math.cos((45 * Math.PI) / 180);
}

export function seededDebris(
  origin: { x: number; y: number; z: number },
  force: { x: number; z: number },
  seed: number,
  count = 12,
): DebrisBit[] {
  const rand = seedRandom(seed);
  const bits: DebrisBit[] = [];
  for (let i = 0; i < count; i++) {
    bits.push({
      x: origin.x,
      y: origin.y,
      z: origin.z,
      vx: force.x * 7 + (rand() - 0.5) * 5,
      vy: 2.5 + rand() * 5,
      vz: force.z * 7 + (rand() - 0.5) * 5,
      scale: 0.08 + rand() * 0.16,
    });
  }
  return bits;
}
