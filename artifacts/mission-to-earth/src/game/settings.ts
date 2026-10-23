export const LOOK_SENSITIVITY_STORAGE_KEY = "mte-look-sensitivity-v1";
export const DEFAULT_LOOK_SENSITIVITY = 1;
export const MIN_LOOK_SENSITIVITY = 0.5;
export const MAX_LOOK_SENSITIVITY = 2;
export const LOOK_SENSITIVITY_STEP = 0.1;

export function normalizeLookSensitivity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LOOK_SENSITIVITY;
  const bounded = Math.max(MIN_LOOK_SENSITIVITY, Math.min(MAX_LOOK_SENSITIVITY, value));
  return Math.round(bounded / LOOK_SENSITIVITY_STEP) * LOOK_SENSITIVITY_STEP;
}

export function parseLookSensitivity(raw: string | null): number {
  if (raw === null || raw.trim() === "") return DEFAULT_LOOK_SENSITIVITY;
  const value = Number(raw);
  return Number.isFinite(value) ? normalizeLookSensitivity(value) : DEFAULT_LOOK_SENSITIVITY;
}
