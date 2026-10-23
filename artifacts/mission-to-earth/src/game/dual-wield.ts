export type WeaponHand = "right" | "left";

export function weaponHandForMouseButton(button: number): WeaponHand | null {
  if (button === 0) return "right";
  if (button === 2) return "left";
  return null;
}

export type ReloadNeed = {
  right: boolean;
  left: boolean;
};

export type ReloadPlan = "none" | "right" | "left" | "staggered" | "simultaneous";

export function planDualReload(need: ReloadNeed, doubleTap: boolean): ReloadPlan {
  if (need.right && need.left) return doubleTap ? "simultaneous" : "staggered";
  if (need.right) return "right";
  if (need.left) return "left";
  return "none";
}

export function dualWieldSpreadMultiplier(focused: boolean) {
  return focused ? 0.82 : 1.25;
}

export function handMuzzleOffset(hand: WeaponHand) {
  return hand === "right" ? 0.17 : -0.17;
}
