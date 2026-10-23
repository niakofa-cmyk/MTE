export type SectorTier = 1 | 2 | 3 | 4;

export function sectorTier(x: number, z: number): SectorTier {
  if (Math.hypot(x - 80, z + 80) < 36 || Math.hypot(x + 80, z - 80) < 36) return 3;
  if (x > 36) return 4;
  if (x < -36) return 1;
  return 2;
}
