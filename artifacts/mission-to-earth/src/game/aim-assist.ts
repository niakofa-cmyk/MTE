export type AimPoint = { x: number; y: number; z: number };

export type AimAssistConfig = {
  coneDeg: number;
  adhesion: number;
  friction: number;
  range: number;
};

export const AIM_ASSIST: AimAssistConfig = {
  coneDeg: 8,
  adhesion: 0.25,
  friction: 0.6,
  range: 150,
};

export function lookForward(yaw: number, pitch: number): AimPoint {
  const cp = Math.cos(pitch);
  return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
}

export function yawPitchToward(origin: AimPoint, target: AimPoint) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dz = target.z - origin.z;
  const horizontal = Math.hypot(dx, dz) || 0.0001;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, horizontal) };
}

function wrapPi(angle: number) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

export function applyAimAssist(input: {
  origin: AimPoint;
  yaw: number;
  pitch: number;
  lookX: number;
  lookY: number;
  targets: AimPoint[];
  dt: number;
  config?: Partial<AimAssistConfig>;
}) {
  const config = { ...AIM_ASSIST, ...input.config };
  const forward = lookForward(input.yaw, input.pitch);
  const cone = (config.coneDeg * Math.PI) / 180;
  let best: AimPoint | null = null;
  let bestAngle = cone;
  for (const target of input.targets) {
    const dx = target.x - input.origin.x;
    const dy = target.y - input.origin.y;
    const dz = target.z - input.origin.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.4 || distance > config.range) continue;
    const dot = (forward.x * dx + forward.y * dy + forward.z * dz) / distance;
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle < bestAngle) {
      bestAngle = angle;
      best = target;
    }
  }
  if (!best) return { lookX: input.lookX, lookY: input.lookY, yawPull: 0, pitchPull: 0, locked: false };
  const want = yawPitchToward(input.origin, best);
  const step = config.adhesion * 0.1 * Math.min(2, input.dt * 60);
  return {
    lookX: input.lookX * config.friction,
    lookY: input.lookY * config.friction,
    yawPull: wrapPi(want.yaw - input.yaw) * step,
    pitchPull: (want.pitch - input.pitch) * step,
    locked: true,
  };
}
