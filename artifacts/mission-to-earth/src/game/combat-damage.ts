export type HitZone = "head" | "body" | "leg";

export type HitDamageResult = {
  damage: number;
  slowsTarget: boolean;
};

export function resolveHitDamage(
  baseDamage: number,
  zone: HitZone,
  skillShot: boolean,
): HitDamageResult {
  let damage = baseDamage;
  if (zone === "head") damage *= 2.15;
  if (zone === "leg") damage *= 0.72;
  if (skillShot) damage *= 1.35;
  return { damage, slowsTarget: zone === "leg" };
}
