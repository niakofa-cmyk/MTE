import { type WeaponDef, type WeaponId } from "@/game/content";
import { sectorTier, type SectorTier } from "./loot-location.ts";
import {
  applyValidAttachments,
  PERK_FLAGS,
  readAttachment,
  validateAttachmentJson,
  type PerkFlag,
} from "@/game/weapon-mod";

export { sectorTier } from "./loot-location.ts";
export type { SectorTier } from "./loot-location.ts";
export type ItemTier = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY" | "ANOMALY";
export type AttachSlot = "BARREL" | "RECEIVER" | "OPTIC" | "UNDERBARREL" | "MAGAZINE";
export type WeaponClass = "BALLISTIC" | "ENERGY_RAIL";
export type Perk = PerkFlag;

export type Attachment = {
  attachmentId: string;
  name: string;
  slot: AttachSlot;
  compatibleClass: WeaponClass | "ALL";
  modifiers: {
    recoilMultiplier: number;
    fireRateMultiplier: number;
    damageMultiplier: number;
    soundRadiusOverride?: number;
  };
  specialPerkFlag?: Perk;
};

type Grant =
  | { type: "weapon"; weaponId: WeaponId }
  | { type: "med" }
  | { type: "armor" }
  | { type: "mod"; attachmentId: string }
  | { type: "intel" };

type LootDrop = {
  itemId: string;
  itemName: string;
  itemTier: ItemTier;
  baseSpawnChance: number;
  minSectorRequirement: SectorTier;
  scrapValueCredit: number;
  grant: Grant;
};

const PERKS: readonly Perk[] = PERK_FLAGS;

export const ATTACHMENTS: Attachment[] = [
  {
    attachmentId: "att_shroud_barrel_01",
    name: "SHROUD BARREL",
    slot: "BARREL",
    compatibleClass: "ALL",
    modifiers: { recoilMultiplier: 1.05, fireRateMultiplier: 1, damageMultiplier: 0.95, soundRadiusOverride: 2 },
    specialPerkFlag: "ACOUSTIC_STEALTH_MASK",
  },
  {
    attachmentId: "att_heavy_stabilizer_02",
    name: "HEAVY STABILIZER",
    slot: "BARREL",
    compatibleClass: "BALLISTIC",
    modifiers: { recoilMultiplier: 0.75, fireRateMultiplier: 0.9, damageMultiplier: 1.05 },
    specialPerkFlag: "FLINCH_IMMUNITY",
  },
  {
    attachmentId: "att_overcharged_capacitor_03",
    name: "OVERCHARGED CAPACITOR",
    slot: "RECEIVER",
    compatibleClass: "ENERGY_RAIL",
    modifiers: { recoilMultiplier: 1.35, fireRateMultiplier: 0.6, damageMultiplier: 1.75 },
    specialPerkFlag: "ENV_MESH_PENETRATION",
  },
  {
    attachmentId: "att_lightweight_burst_04",
    name: "LIGHTWEIGHT BURST",
    slot: "RECEIVER",
    compatibleClass: "BALLISTIC",
    modifiers: { recoilMultiplier: 0.9, fireRateMultiplier: 1.5, damageMultiplier: 0.8 },
    specialPerkFlag: "SLIDE_ACCURACY_BUFF",
  },
  {
    attachmentId: "att_holo_tactical_05",
    name: "HOLO OPTIC",
    slot: "OPTIC",
    compatibleClass: "ALL",
    modifiers: { recoilMultiplier: 0.95, fireRateMultiplier: 1, damageMultiplier: 1 },
    specialPerkFlag: "SKILLSHOT_HIGHLIGHT",
  },
  {
    attachmentId: "att_chrono_tracer_scope_06",
    name: "CHRONO-TRACER",
    slot: "OPTIC",
    compatibleClass: "ENERGY_RAIL",
    modifiers: { recoilMultiplier: 1.1, fireRateMultiplier: 1, damageMultiplier: 1 },
    specialPerkFlag: "TRACK_TRAIL_VISIBILITY",
  },
  {
    attachmentId: "att_extended_drum_07",
    name: "EXTENDED DRUM",
    slot: "MAGAZINE",
    compatibleClass: "BALLISTIC",
    modifiers: { recoilMultiplier: 1.15, fireRateMultiplier: 1, damageMultiplier: 1 },
    specialPerkFlag: "CAPACITY_DOUBLE",
  },
];

export const ATTACHMENT_BY_ID: Record<string, Attachment> = Object.fromEntries(
  ATTACHMENTS.map((row) => [row.attachmentId, row]),
);

const DROPS: LootDrop[] = [
  { itemId: "wep_scav_smg_01", itemName: "SCAVENGER SMG", itemTier: "COMMON", baseSpawnChance: 45, minSectorRequirement: 1, scrapValueCredit: 50, grant: { type: "weapon", weaponId: "smg" } },
  { itemId: "wep_inf_rifle_02", itemName: "INFANTRY RIFLE", itemTier: "UNCOMMON", baseSpawnChance: 25, minSectorRequirement: 2, scrapValueCredit: 150, grant: { type: "weapon", weaponId: "rifle" } },
  { itemId: "wep_ussf_rail_03", itemName: "TACTICAL RAIL", itemTier: "RARE", baseSpawnChance: 12.5, minSectorRequirement: 3, scrapValueCredit: 450, grant: { type: "weapon", weaponId: "rail" } },
  { itemId: "wep_solar_sniper_04", itemName: "SOLAR RAIL", itemTier: "LEGENDARY", baseSpawnChance: 3.5, minSectorRequirement: 4, scrapValueCredit: 1200, grant: { type: "weapon", weaponId: "rail" } },
  { itemId: "wep_desc_void_05", itemName: "VOID PISTOL", itemTier: "ANOMALY", baseSpawnChance: 0.5, minSectorRequirement: 4, scrapValueCredit: 5000, grant: { type: "weapon", weaponId: "needles" } },
  { itemId: "res_nanite_inject_01", itemName: "NANITE SWARM", itemTier: "UNCOMMON", baseSpawnChance: 30, minSectorRequirement: 1, scrapValueCredit: 75, grant: { type: "med" } },
  { itemId: "res_armor_plate_02", itemName: "CERAMIC PLATE", itemTier: "RARE", baseSpawnChance: 15, minSectorRequirement: 2, scrapValueCredit: 200, grant: { type: "armor" } },
  { itemId: "res_emp_shield_03", itemName: "EMP INVERTER", itemTier: "LEGENDARY", baseSpawnChance: 5, minSectorRequirement: 3, scrapValueCredit: 800, grant: { type: "armor" } },
  { itemId: "intel_eon_dusk_schematic", itemName: "EON DUSK BLUEPRINTS", itemTier: "LEGENDARY", baseSpawnChance: 2, minSectorRequirement: 3, scrapValueCredit: 2500, grant: { type: "intel" } },
  { itemId: "intel_pure_blood_dna", itemName: "LINEAGE KEY", itemTier: "ANOMALY", baseSpawnChance: 1, minSectorRequirement: 4, scrapValueCredit: 10000, grant: { type: "intel" } },
  { itemId: "att_shroud_barrel_01", itemName: "SHROUD BARREL", itemTier: "UNCOMMON", baseSpawnChance: 8, minSectorRequirement: 1, scrapValueCredit: 120, grant: { type: "mod", attachmentId: "att_shroud_barrel_01" } },
  { itemId: "att_heavy_stabilizer_02", itemName: "HEAVY STABILIZER", itemTier: "UNCOMMON", baseSpawnChance: 7, minSectorRequirement: 2, scrapValueCredit: 160, grant: { type: "mod", attachmentId: "att_heavy_stabilizer_02" } },
  { itemId: "att_overcharged_capacitor_03", itemName: "OVERCHARGED CAPACITOR", itemTier: "RARE", baseSpawnChance: 4, minSectorRequirement: 3, scrapValueCredit: 700, grant: { type: "mod", attachmentId: "att_overcharged_capacitor_03" } },
  { itemId: "att_lightweight_burst_04", itemName: "LIGHTWEIGHT BURST", itemTier: "UNCOMMON", baseSpawnChance: 7, minSectorRequirement: 2, scrapValueCredit: 180, grant: { type: "mod", attachmentId: "att_lightweight_burst_04" } },
  { itemId: "att_holo_tactical_05", itemName: "HOLO OPTIC", itemTier: "UNCOMMON", baseSpawnChance: 9, minSectorRequirement: 2, scrapValueCredit: 140, grant: { type: "mod", attachmentId: "att_holo_tactical_05" } },
  { itemId: "att_chrono_tracer_scope_06", itemName: "CHRONO-TRACER", itemTier: "RARE", baseSpawnChance: 3.5, minSectorRequirement: 3, scrapValueCredit: 420, grant: { type: "mod", attachmentId: "att_chrono_tracer_scope_06" } },
  { itemId: "att_extended_drum_07", itemName: "EXTENDED DRUM", itemTier: "UNCOMMON", baseSpawnChance: 8, minSectorRequirement: 1, scrapValueCredit: 90, grant: { type: "mod", attachmentId: "att_extended_drum_07" } },
];

const ID_PATTERN = /^att_[a-z0-9_]{3,40}$/;

function assertAttachment(data: Attachment) {
  const parsed = validateAttachmentJson(data);
  if (!ID_PATTERN.test(parsed.attachmentId)) throw new Error(`bad attachment id ${data.attachmentId}`);
  if (data.specialPerkFlag && !PERKS.includes(data.specialPerkFlag)) throw new Error(data.specialPerkFlag);
}

for (const row of ATTACHMENTS) assertAttachment(row);

export function sectorLabel(x: number, z: number) {
  if (z < -118) return "RECOVERY CORRIDOR";
  const tier = sectorTier(x, z);
  if (tier === 1) return "SUNKEN SLUMS";
  if (tier === 3) return "CRADLE OUTSKIRTS";
  if (tier === 4) return "MONOLITH CORE";
  return "NEON BELT";
}

export function weaponClass(id: WeaponId): WeaponClass {
  return id === "rail" || id === "needles" ? "ENERGY_RAIL" : "BALLISTIC";
}

export type CompiledGun = {
  dmg: number;
  rpm: number;
  recoil: number;
  spread: number;
  adsSpread: number;
  mag: number;
  soundRadius: number;
  perks: Set<Perk>;
  modCount: number;
};

export function compileWeapon(weapon: WeaponDef, modIds: string[]): CompiledGun {
  const list = [];
  for (const id of modIds) {
    const attachment = ATTACHMENT_BY_ID[id];
    if (!attachment) continue;
    const parsed = readAttachment(attachment);
    if (parsed) list.push(parsed);
  }
  const stacked = applyValidAttachments(list, weaponClass(weapon.id));
  const perks = new Set<Perk>(stacked.perks);
  const mag = weapon.mag * (perks.has("CAPACITY_DOUBLE") ? 2 : 1);
  return {
    dmg: weapon.dmg * stacked.damage,
    rpm: Math.max(8, weapon.rpm * stacked.rate),
    recoil: weapon.recoil * stacked.recoil,
    spread: weapon.spread,
    adsSpread: perks.has("SKILLSHOT_HIGHLIGHT") ? weapon.adsSpread * 0.65 : weapon.adsSpread,
    mag,
    soundRadius: stacked.sound ?? 36,
    perks,
    modCount: stacked.count,
  };
}

function banks(drop: LootDrop) {
  if (drop.grant.type === "intel" || drop.grant.type === "mod") return drop.scrapValueCredit;
  if (drop.itemTier === "LEGENDARY" || drop.itemTier === "ANOMALY") return drop.scrapValueCredit;
  return 0;
}

export type RolledLoot = {
  kind: "weapon" | "med" | "armor" | "mod" | "intel";
  weaponId?: WeaponId;
  modId?: string;
  label: string;
  scrap: number;
  x: number;
  z: number;
};

export function rollLoot(x: number, z: number, rand: () => number): RolledLoot {
  const tier = sectorTier(x, z);
  const pool = DROPS.filter((drop) => drop.minSectorRequirement <= tier);
  const total = pool.reduce((sum, drop) => sum + drop.baseSpawnChance, 0);
  let cursor = rand() * total;
  let chosen = pool[0]!;
  for (const drop of pool) {
    cursor -= drop.baseSpawnChance;
    if (cursor <= 0) {
      chosen = drop;
      break;
    }
  }
  const scrap = banks(chosen);
  const grant = chosen.grant;
  if (grant.type === "weapon") {
    return { kind: "weapon", weaponId: grant.weaponId, label: chosen.itemName, scrap, x, z };
  }
  if (grant.type === "med") return { kind: "med", label: chosen.itemName, scrap, x, z };
  if (grant.type === "armor") return { kind: "armor", label: chosen.itemName, scrap, x, z };
  if (grant.type === "mod") return { kind: "mod", modId: grant.attachmentId, label: chosen.itemName, scrap, x, z };
  return { kind: "intel" as const, label: chosen.itemName, scrap, x, z };
}
