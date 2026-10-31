export const TOUCH_LAYOUT_STORAGE_KEY = "mte-touch-layout-v1";

export type TouchControlProfile = "beginner" | "tactical" | "advanced";
export type TouchHandedness = "right" | "left";
export type TouchScreenSide = "left" | "right";
export type TouchPrimaryZone = "MOVEMENT" | "LOOK_COMBAT";

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

export function touchZoneForScreenSide(
  side: TouchScreenSide,
  handedness: TouchHandedness,
): TouchPrimaryZone {
  const movementSide = handedness === "right" ? "left" : "right";
  return side === movementSide ? "MOVEMENT" : "LOOK_COMBAT";
}
