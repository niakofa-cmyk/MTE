import { readLocalItem, writeLocalItem } from "./local-storage.ts";

// These names are part of the local-save compatibility contract; player-facing copy uses Earth-side terminology.
const KEY = "mte-mars-v2";
const BACKUP_KEY = "mte-mars-v2-backup";
const LEGACY_KEY = "mte-mars-v1";
const SAVE_VERSION = 2;
const MAX_CREDITS = 999_999_999;
const MAX_STACK = 999_999;

export type StashItem = {
  stashItemUuid: string;
  itemRegistryId: string;
  quantity: number;
  currentDurability: number;
  extractedFromSectorId: number;
  tradeLocked: boolean;
};

export type ModField = "barrelModId" | "receiverModId" | "opticModId" | "magazineModId";

export type LoadoutPreset = {
  slotIndex: 1 | 2 | 3;
  baseWeaponId: string;
  barrelModId: string | null;
  receiverModId: string | null;
  opticModId: string | null;
  magazineModId: string | null;
};

export type MarsProfile = {
  martianCredits: number;
  unlockedBlueprints: string[];
  stash: StashItem[];
  activeSlot: 1 | 2 | 3;
  loadouts: LoadoutPreset[];
};

export type ExtractedPiece = {
  itemRegistryId: string;
  sectorTier: number;
};

const NAMES: Record<string, string> = {
  wep_scav_smg_01: "SCAVENGER SMG",
  wep_inf_rifle_02: "INFANTRY RIFLE",
  wep_ussf_rail_03: "TACTICAL RAIL",
  wep_solar_sniper_04: "SOLAR RAIL",
  wep_desc_void_05: "VOID PISTOL",
  intel_eon_dusk_schematic: "EON DUSK BLUEPRINTS",
  intel_pure_blood_dna: "LINEAGE KEY",
};

const WEAPON_OF: Record<string, string> = {
  wep_scav_smg_01: "smg",
  wep_inf_rifle_02: "rifle",
  wep_ussf_rail_03: "rail",
  wep_solar_sniper_04: "rail",
  wep_desc_void_05: "needles",
};

const RULES: Record<string, { name: string; slot: "BARREL" | "RECEIVER" | "OPTIC" | "MAGAZINE"; cls: "ALL" | "BALLISTIC" | "ENERGY_RAIL" }> = {
  att_shroud_barrel_01: { name: "SHROUD BARREL", slot: "BARREL", cls: "ALL" },
  att_heavy_stabilizer_02: { name: "HEAVY STABILIZER", slot: "BARREL", cls: "BALLISTIC" },
  att_overcharged_capacitor_03: { name: "OVERCHARGED CAPACITOR", slot: "RECEIVER", cls: "ENERGY_RAIL" },
  att_lightweight_burst_04: { name: "LIGHTWEIGHT BURST", slot: "RECEIVER", cls: "BALLISTIC" },
  att_holo_tactical_05: { name: "HOLO OPTIC", slot: "OPTIC", cls: "ALL" },
  att_chrono_tracer_scope_06: { name: "CHRONO-TRACER", slot: "OPTIC", cls: "ENERGY_RAIL" },
  att_extended_drum_07: { name: "EXTENDED DRUM", slot: "MAGAZINE", cls: "BALLISTIC" },
};

export const COIL_EMISSION = 1.8;
const WEAPON_IDS = new Set(["smg", "rifle", "shotgun", "lmg", "rail", "pistol", "needles", "slug"]);
const ITEM_IDS = new Set([...Object.keys(NAMES), ...Object.keys(RULES)]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function safeMod(value: unknown, slot: Rule["slot"]) {
  if (typeof value !== "string") return null;
  return RULES[value]?.slot === slot ? value : null;
}

type Rule = (typeof RULES)[string];

function newStashItemId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // Use a local fallback in browser contexts without Web Crypto.
  }
  return `stash-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanStash(value: unknown): StashItem[] {
  if (!Array.isArray(value)) return [];
  const stacks = new Map<string, StashItem>();
  for (const raw of value.slice(0, 1000)) {
    if (!isRecord(raw) || typeof raw.itemRegistryId !== "string" || !ITEM_IDS.has(raw.itemRegistryId)) continue;
    const itemRegistryId = raw.itemRegistryId;
    const quantity = safeInteger(raw.quantity, 1, 1, MAX_STACK);
    const existing = stacks.get(itemRegistryId);
    if (existing) {
      existing.quantity = Math.min(MAX_STACK, existing.quantity + quantity);
      continue;
    }
    const uuid = typeof raw.stashItemUuid === "string" && raw.stashItemUuid.length <= 96
      ? raw.stashItemUuid
      : newStashItemId();
    stacks.set(itemRegistryId, {
      stashItemUuid: uuid || newStashItemId(),
      itemRegistryId,
      quantity,
      currentDurability: safeInteger(raw.currentDurability, 100, 0, 100),
      extractedFromSectorId: safeInteger(raw.extractedFromSectorId, 1, 1, 4),
      tradeLocked: raw.tradeLocked === true,
    });
  }
  return [...stacks.values()];
}

function cleanLoadouts(value: unknown): LoadoutPreset[] {
  const base = [blankPreset(1), blankPreset(2), blankPreset(3)];
  if (!Array.isArray(value)) return base;
  return base.map((preset) => {
    const raw = value.find((item) => isRecord(item) && item.slotIndex === preset.slotIndex);
    if (!isRecord(raw)) return preset;
    const weaponId = typeof raw.baseWeaponId === "string" && WEAPON_IDS.has(raw.baseWeaponId) ? raw.baseWeaponId : "";
    return {
      slotIndex: preset.slotIndex,
      baseWeaponId: weaponId,
      barrelModId: safeMod(raw.barrelModId, "BARREL"),
      receiverModId: safeMod(raw.receiverModId, "RECEIVER"),
      opticModId: safeMod(raw.opticModId, "OPTIC"),
      magazineModId: safeMod(raw.magazineModId, "MAGAZINE"),
    };
  });
}

function cleanMarsProfile(value: unknown): MarsProfile | null {
  if (!isRecord(value)) return null;
  const blueprints = Array.isArray(value.unlockedBlueprints)
    ? [...new Set(value.unlockedBlueprints.filter((id): id is string => typeof id === "string" && Object.hasOwn(RULES, id)))].slice(0, 100)
    : [];
  return {
    martianCredits: safeInteger(value.martianCredits, 0, 0, MAX_CREDITS),
    unlockedBlueprints: blueprints,
    stash: cleanStash(value.stash),
    activeSlot: value.activeSlot === 2 || value.activeSlot === 3 ? value.activeSlot : 1,
    loadouts: cleanLoadouts(value.loadouts),
  };
}

export function parseMarsProfile(raw: string | null): MarsProfile | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if ("schemaVersion" in parsed) {
      if (parsed.schemaVersion !== SAVE_VERSION) return null;
      return cleanMarsProfile(parsed.profile);
    }
    // The v1 save stored MarsProfile directly without an envelope.
    return cleanMarsProfile(parsed);
  } catch {
    return null;
  }
}

export function serializeMarsProfile(profile: MarsProfile) {
  return JSON.stringify({
    schemaVersion: SAVE_VERSION,
    profile: cleanMarsProfile(profile) ?? emptyMars(),
  });
}

export function solarCoilEmits(r: number, g: number, b: number) {
  return r > 0.8 && g > 0.4 && b < 0.2;
}

export function labelForRegistry(id: string) {
  return RULES[id]?.name ?? NAMES[id] ?? id;
}

export function registryForLabel(label: string | undefined) {
  if (!label) return null;
  const hit = Object.entries(NAMES).find(([, name]) => name === label);
  return hit?.[0] ?? null;
}

export function registryForWeaponId(weaponId: string, label?: string) {
  const matches = Object.entries(WEAPON_OF)
    .filter(([, id]) => id === weaponId)
    .map(([registryId]) => registryId);
  if (label) {
    const normalizedLabel = label.trim().toUpperCase();
    const namedMatch = matches.find((id) => NAMES[id]?.toUpperCase() === normalizedLabel);
    if (namedMatch) return namedMatch;
  }
  return matches.length === 1 ? matches[0]! : null;
}

export function weaponIdForRegistry(id: string) {
  return WEAPON_OF[id] ?? null;
}

function blankPreset(slotIndex: 1 | 2 | 3): LoadoutPreset {
  return {
    slotIndex,
    baseWeaponId: "",
    barrelModId: null,
    receiverModId: null,
    opticModId: null,
    magazineModId: null,
  };
}

export function emptyMars(): MarsProfile {
  return {
    martianCredits: 0,
    unlockedBlueprints: [],
    stash: [],
    activeSlot: 1,
    loadouts: [blankPreset(1), blankPreset(2), blankPreset(3)],
  };
}

export function loadMars(): MarsProfile {
  return (
    parseMarsProfile(readLocalItem(KEY)) ??
    parseMarsProfile(readLocalItem(BACKUP_KEY)) ??
    parseMarsProfile(readLocalItem(LEGACY_KEY)) ??
    emptyMars()
  );
}

export function saveMars(profile: MarsProfile) {
  const serialized = serializeMarsProfile(profile);
  const prior = readLocalItem(KEY);
  if (prior && parseMarsProfile(prior)) writeLocalItem(BACKUP_KEY, prior);
  if (!writeLocalItem(KEY, serialized)) return false;
  writeLocalItem(BACKUP_KEY, serialized);
  return true;
}

export function ensureCredits(profile: MarsProfile, recordScrap: number) {
  if (profile.martianCredits === 0 && recordScrap > 0 && profile.stash.length === 0 && profile.unlockedBlueprints.length === 0) {
    return { ...profile, martianCredits: recordScrap };
  }
  return profile;
}

export function commitExtraction(profile: MarsProfile, credits: number, pieces: ExtractedPiece[]): MarsProfile {
  const cleanProfile = cleanMarsProfile(profile) ?? emptyMars();
  const stash = cleanProfile.stash.map((row) => ({ ...row }));
  const blueprints = new Set(cleanProfile.unlockedBlueprints);
  for (const piece of pieces) {
    if (!piece?.itemRegistryId || !ITEM_IDS.has(piece.itemRegistryId)) continue;
    if (piece.itemRegistryId.startsWith("att_")) blueprints.add(piece.itemRegistryId);
    const existing = stash.find((row) => row.itemRegistryId === piece.itemRegistryId);
    if (existing) {
      existing.quantity += 1;
      existing.extractedFromSectorId = piece.sectorTier;
    } else {
      stash.push({
        stashItemUuid: crypto.randomUUID(),
        itemRegistryId: piece.itemRegistryId,
        quantity: 1,
        currentDurability: 100,
        extractedFromSectorId: safeInteger(piece.sectorTier, 1, 1, 4),
        tradeLocked: false,
      });
    }
  }
  return cleanMarsProfile({
    ...cleanProfile,
    martianCredits: cleanProfile.martianCredits + safeInteger(credits, 0, 0, MAX_CREDITS),
    unlockedBlueprints: [...blueprints],
    stash,
  }) ?? emptyMars();
}

export function setActiveSlot(profile: MarsProfile, slot: 1 | 2 | 3): MarsProfile {
  return { ...profile, activeSlot: slot };
}

export function setPresetMod(profile: MarsProfile, field: ModField, id: string | null, weaponId: string): MarsProfile {
  const cleanProfile = cleanMarsProfile(profile) ?? emptyMars();
  return {
    ...cleanProfile,
    loadouts: cleanProfile.loadouts.map((row) =>
      row.slotIndex === cleanProfile.activeSlot ? { ...row, baseWeaponId: weaponId, [field]: id } : row,
    ),
  };
}

export function modsForDrop(profile: MarsProfile, weaponId: string) {
  const preset = profile.loadouts.find((row) => row.slotIndex === profile.activeSlot);
  if (!preset) return [];
  const chassis = weaponId === "rail" || weaponId === "needles" ? "ENERGY_RAIL" : "BALLISTIC";
  const ids = [preset.barrelModId, preset.receiverModId, preset.opticModId, preset.magazineModId];
  const seated: string[] = [];
  for (const id of ids) {
    if (!id || !profile.unlockedBlueprints.includes(id)) continue;
    const rule = RULES[id];
    if (!rule || (rule.cls !== "ALL" && rule.cls !== chassis)) continue;
    seated.push(id);
  }
  return seated;
}
