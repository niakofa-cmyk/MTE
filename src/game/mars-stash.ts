const KEY = "mte-mars-v1";

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
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyMars();
    const parsed = JSON.parse(raw) as Partial<MarsProfile>;
    const base = emptyMars();
    const loadouts = base.loadouts.map((preset) => {
      const found = parsed.loadouts?.find((row) => row.slotIndex === preset.slotIndex);
      return found ? { ...preset, ...found, slotIndex: preset.slotIndex } : preset;
    });
    return {
      martianCredits: parsed.martianCredits || 0,
      unlockedBlueprints: Array.isArray(parsed.unlockedBlueprints) ? parsed.unlockedBlueprints.filter((id) => typeof id === "string") : [],
      stash: Array.isArray(parsed.stash) ? parsed.stash : [],
      activeSlot: parsed.activeSlot === 2 || parsed.activeSlot === 3 ? parsed.activeSlot : 1,
      loadouts,
    };
  } catch {
    return emptyMars();
  }
}

export function saveMars(profile: MarsProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function ensureCredits(profile: MarsProfile, recordScrap: number) {
  if (profile.martianCredits === 0 && recordScrap > 0 && profile.stash.length === 0 && profile.unlockedBlueprints.length === 0) {
    return { ...profile, martianCredits: recordScrap };
  }
  return profile;
}

export function commitExtraction(profile: MarsProfile, credits: number, pieces: ExtractedPiece[]): MarsProfile {
  const stash = profile.stash.map((row) => ({ ...row }));
  const blueprints = new Set(profile.unlockedBlueprints);
  for (const piece of pieces) {
    if (!piece.itemRegistryId) continue;
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
        extractedFromSectorId: piece.sectorTier,
        tradeLocked: false,
      });
    }
  }
  return {
    ...profile,
    martianCredits: profile.martianCredits + Math.max(0, Math.floor(credits)),
    unlockedBlueprints: [...blueprints],
    stash,
  };
}

export function setActiveSlot(profile: MarsProfile, slot: 1 | 2 | 3): MarsProfile {
  return { ...profile, activeSlot: slot };
}

export function setPresetMod(profile: MarsProfile, field: ModField, id: string | null, weaponId: string): MarsProfile {
  return {
    ...profile,
    loadouts: profile.loadouts.map((row) =>
      row.slotIndex === profile.activeSlot ? { ...row, baseWeaponId: weaponId, [field]: id } : row,
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
