export type LootItemProfile = {
  id: string;
  itemType: "WEAPON" | "ATTACHMENT" | "INTEL_DATA";
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY" | "ANOMALY";
  baseWeight: number;
  currencyScrapValue: number;
  kind: "weapon" | "mod" | "intel";
  weaponId?: "smg";
  modId?: string;
  label: string;
};

export type ExtractionSiteZone = {
  sectorTier: number;
  uprisingActive: boolean;
  localDangerFactor: number;
};

export const EXTRACTION_REGISTRY: LootItemProfile[] = [
  { id: "wep_scav_smg_01", itemType: "WEAPON", rarity: "COMMON", baseWeight: 100, currencyScrapValue: 50, kind: "weapon", weaponId: "smg", label: "SCAVENGER SMG" },
  { id: "att_shroud_barrel_01", itemType: "ATTACHMENT", rarity: "UNCOMMON", baseWeight: 65, currencyScrapValue: 120, kind: "mod", modId: "att_shroud_barrel_01", label: "SHROUD BARREL" },
  { id: "att_heavy_stabilizer_02", itemType: "ATTACHMENT", rarity: "UNCOMMON", baseWeight: 50, currencyScrapValue: 150, kind: "mod", modId: "att_heavy_stabilizer_02", label: "HEAVY STABILIZER" },
  { id: "att_overcharged_capacitor_03", itemType: "ATTACHMENT", rarity: "RARE", baseWeight: 25, currencyScrapValue: 400, kind: "mod", modId: "att_overcharged_capacitor_03", label: "OVERCHARGED CAPACITOR" },
  { id: "att_chrono_tracer_scope_06", itemType: "ATTACHMENT", rarity: "LEGENDARY", baseWeight: 8, currencyScrapValue: 950, kind: "mod", modId: "att_chrono_tracer_scope_06", label: "CHRONO-TRACER" },
  { id: "intel_eon_dusk_schematic", itemType: "INTEL_DATA", rarity: "LEGENDARY", baseWeight: 4, currencyScrapValue: 2500, kind: "intel", label: "EON DUSK BLUEPRINTS" },
  { id: "intel_pure_blood_dna", itemType: "INTEL_DATA", rarity: "ANOMALY", baseWeight: 1, currencyScrapValue: 10000, kind: "intel", label: "LINEAGE KEY" },
];

const BY_ID = new Map(EXTRACTION_REGISTRY.map((item) => [item.id, item]));

export function resolveExtractionDrop(id: string) {
  const item = BY_ID.get(id);
  if (!item) return null;
  return {
    kind: item.kind,
    weaponId: item.weaponId,
    modId: item.modId,
    label: item.label,
    scrap: item.currencyScrapValue,
  };
}

export function generateContainerDropArray(
  siteContext: ExtractionSiteZone,
  matchTimeProgressRatio: number,
  rand: () => number = Math.random,
): string[] {
  const selected: string[] = [];
  const progress = Math.min(1, Math.max(0, matchTimeProgressRatio));
  const danger = Math.min(5, Math.max(1, siteContext.localDangerFactor));
  for (let i = 0; i < 4; i++) {
    let sum = 0;
    const weights: { id: string; weight: number }[] = [];
    for (const item of EXTRACTION_REGISTRY) {
      if (item.rarity === "ANOMALY" && siteContext.sectorTier < 4) continue;
      if (item.rarity === "LEGENDARY" && !siteContext.uprisingActive && danger < 3) continue;
      let attenuation = 1;
      if (item.rarity === "LEGENDARY" || item.rarity === "ANOMALY") {
        attenuation += progress * 2.5;
        attenuation += danger * 1.5;
      } else if (item.rarity === "COMMON") {
        attenuation = Math.max(0.1, attenuation - progress * 0.8);
      }
      const weight = item.baseWeight * attenuation;
      weights.push({ id: item.id, weight });
      sum += weight;
    }
    if (sum <= 0) continue;
    let cursor = rand() * sum;
    for (const entry of weights) {
      cursor -= entry.weight;
      if (cursor <= 0) {
        selected.push(entry.id);
        break;
      }
    }
  }
  return selected;
}
