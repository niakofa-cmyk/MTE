import { LEGACY_SPRINT_SHOVE_PX, SPRINT_SHOVE_PX } from "./touch-controller.ts";

export const TOUCH_LAYOUT_STORAGE_KEY = "mte-touch-layout-v1";
export const TOUCH_TUNING_STORAGE_KEY = "mte-touch-tune-v1";

export type TouchControlProfile = "beginner" | "tactical" | "advanced";
export type TouchHandedness = "right" | "left";
export type TouchScreenSide = "left" | "right";
export type TouchPrimaryZone = "MOVEMENT" | "LOOK_COMBAT";
export type TouchTuning = {
  flick: number;
  shove: number;
  look: number;
  disc: number;
  discRight: number;
  discTop: number;
  cone: number;
  magnet: number;
  drag: number;
};

export interface TouchLayoutSettings {
  profile: TouchControlProfile;
  handedness: TouchHandedness;
}

export const DEFAULT_TOUCH_LAYOUT: TouchLayoutSettings = {
  profile: "tactical",
  handedness: "right",
};

export const TOUCH_CONTROL_PRESETS = {
  beginner: {
    flick: 20,
    shove: 58,
    look: 1.25,
    cone: 11,
    magnet: 0.4,
    drag: 0.7,
  },
  tactical: {
    flick: 15,
    shove: 48,
    look: 1.7,
    cone: 8,
    magnet: 0.25,
    drag: 0.6,
  },
  advanced: {
    flick: 11,
    shove: 44,
    look: 2.3,
    cone: 5,
    magnet: 0.15,
    drag: 0.45,
  },
} as const;

export const DEFAULT_TOUCH_TUNING: TouchTuning = {
  flick: 15,
  shove: SPRINT_SHOVE_PX,
  look: 1.7,
  disc: 1,
  discRight: 24,
  discTop: 55,
  cone: 8,
  magnet: 0.25,
  drag: 0.6,
};

const TOUCH_TUNING_LIMITS = {
  flick: [8, 80, 1],
  shove: [40, 120, 1],
  look: [0.6, 2.8, 0.1],
  disc: [0.7, 1.4, 0.1],
  discRight: [8, 120, 1],
  discTop: [20, 80, 1],
  cone: [3, 14, 1],
  magnet: [0, 0.6, 0.05],
  drag: [0.3, 1, 0.05],
} as const satisfies Record<keyof TouchTuning, readonly [number, number, number]>;

export function parseTouchLayout(raw: string | null): TouchLayoutSettings {
  if (!raw) return { ...DEFAULT_TOUCH_LAYOUT };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { ...DEFAULT_TOUCH_LAYOUT };
    const settings = value as Partial<TouchLayoutSettings>;
    return {
      profile:
        settings.profile === "beginner" ||
        settings.profile === "tactical" ||
        settings.profile === "advanced"
          ? settings.profile
          : DEFAULT_TOUCH_LAYOUT.profile,
      handedness:
        settings.handedness === "left" || settings.handedness === "right"
          ? settings.handedness
          : DEFAULT_TOUCH_LAYOUT.handedness,
    };
  } catch {
    return { ...DEFAULT_TOUCH_LAYOUT };
  }
}

export function parseTouchTuning(raw: string | null): TouchTuning {
  if (!raw) return { ...DEFAULT_TOUCH_TUNING };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_TOUCH_TUNING };
    }
    const saved = value as Partial<Record<keyof TouchTuning, unknown>>;
    const read = (key: keyof TouchTuning) => {
      const [min, max, step] = TOUCH_TUNING_LIMITS[key];
      const candidate = saved[key];
      if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
        return DEFAULT_TOUCH_TUNING[key];
      }
      const bounded = Math.max(min, Math.min(max, candidate));
      const snapped = min + Math.round((bounded - min) / step) * step;
      return Number(snapped.toFixed(3));
    };

    return {
      flick: read("flick"),
      shove: saved.shove === LEGACY_SPRINT_SHOVE_PX ? SPRINT_SHOVE_PX : read("shove"),
      look: read("look"),
      disc: read("disc"),
      discRight: read("discRight"),
      discTop: read("discTop"),
      cone: read("cone"),
      magnet: read("magnet"),
      drag: read("drag"),
    };
  } catch {
    return { ...DEFAULT_TOUCH_TUNING };
  }
}

export function touchZoneForScreenSide(
  side: TouchScreenSide,
  handedness: TouchHandedness,
): TouchPrimaryZone {
  const movementSide = handedness === "right" ? "left" : "right";
  return side === movementSide ? "MOVEMENT" : "LOOK_COMBAT";
}
