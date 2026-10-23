export const ATTACHMENT_ID = /^att_[a-z0-9_]{3,40}$/;

export const ATTACH_SLOTS = ["BARREL", "RECEIVER", "OPTIC", "UNDERBARREL", "MAGAZINE"] as const;
export const WEAPON_CLASSES = ["BALLISTIC", "ENERGY_RAIL", "ALL"] as const;
export const PERK_FLAGS = [
  "ACOUSTIC_STEALTH_MASK",
  "FLINCH_IMMUNITY",
  "ENV_MESH_PENETRATION",
  "SLIDE_ACCURACY_BUFF",
  "SKILLSHOT_HIGHLIGHT",
  "TRACK_TRAIL_VISIBILITY",
  "CAPACITY_DOUBLE",
] as const;

export type PerkFlag = (typeof PERK_FLAGS)[number];
export type AttachSlotName = (typeof ATTACH_SLOTS)[number];
export type Chassis = (typeof WEAPON_CLASSES)[number];

export type AttachmentBlueprint = {
  attachmentId: string;
  slot: AttachSlotName;
  compatibleClass: Chassis;
  modifiers: {
    recoilMultiplier: number;
    fireRateMultiplier: number;
    damageMultiplier: number;
    soundRadiusOverride?: number;
  };
  specialPerkFlag?: PerkFlag;
};

export type WeaponInstance = {
  instanceId: string;
  weaponId: string;
  baseStats: {
    baseDamage: number;
    baseFireRate: number;
    baseRecoil: number;
    baseSoundRadius: number;
  };
  equippedAttachments: Map<string, AttachmentBlueprint> | readonly AttachmentBlueprint[];
};

export type CompiledRuntime = {
  runtimeDamage: number;
  runtimeFireRate: number;
  runtimeRecoil: number;
  runtimeSoundRadius: number;
  activeGameplayModifiers: PerkFlag[];
};

export type DropTicket = {
  playerId: string;
  selectedCharacterId: string;
  validatedWeaponLoadout: WeaponInstance[];
};

export type SealedDrop = {
  playerId: string;
  selectedCharacterId: string;
  weapons: CompiledRuntime[];
};

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as Record<string, unknown>;
}

function requireBand(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} violates safe range boundaries`);
  }
  return value;
}

export function validateAttachmentJson(payload: unknown): AttachmentBlueprint {
  const data = asRecord(payload);
  const id = data?.attachmentId;
  if (typeof id !== "string" || !ATTACHMENT_ID.test(id)) {
    throw new Error("Invalid or malformed attachmentId");
  }
  const slot = data?.slot;
  if (typeof slot !== "string" || !ATTACH_SLOTS.includes(slot as AttachSlotName)) {
    throw new Error("Invalid or malformed attachmentId");
  }
  const compatibleClass = data?.compatibleClass;
  if (typeof compatibleClass !== "string" || !WEAPON_CLASSES.includes(compatibleClass as Chassis)) {
    throw new Error("Invalid or malformed attachmentId");
  }
  const modifiers = asRecord(data?.modifiers);
  if (!modifiers) throw new Error("modifiers violate safe range boundaries");
  const recoilMultiplier = requireBand(modifiers.recoilMultiplier, 0.1, 3, "recoilMultiplier");
  const fireRateMultiplier = requireBand(modifiers.fireRateMultiplier, 0.1, 3, "fireRateMultiplier");
  const damageMultiplier = requireBand(modifiers.damageMultiplier, 0.1, 3, "damageMultiplier");
  const soundRadiusOverride =
    modifiers.soundRadiusOverride == null ? undefined : requireBand(modifiers.soundRadiusOverride, 0, 100, "soundRadius");
  let specialPerkFlag: PerkFlag | undefined;
  if (data?.specialPerkFlag != null) {
    if (typeof data.specialPerkFlag !== "string" || !PERK_FLAGS.includes(data.specialPerkFlag as PerkFlag)) {
      throw new Error("Invalid or malformed attachmentId");
    }
    specialPerkFlag = data.specialPerkFlag as PerkFlag;
  }
  return {
    attachmentId: id,
    slot: slot as AttachSlotName,
    compatibleClass: compatibleClass as Chassis,
    modifiers: {
      recoilMultiplier,
      fireRateMultiplier,
      damageMultiplier,
      ...(soundRadiusOverride != null ? { soundRadiusOverride } : {}),
    },
    ...(specialPerkFlag ? { specialPerkFlag } : {}),
  };
}

export function readAttachment(payload: unknown): AttachmentBlueprint | null {
  try {
    return validateAttachmentJson(payload);
  } catch {
    return null;
  }
}

export function applyValidAttachments(list: AttachmentBlueprint[], chassis: string) {
  let damage = 1;
  let rate = 1;
  let recoil = 1;
  let sound: number | null = null;
  const perks: PerkFlag[] = [];
  let count = 0;
  for (const attachment of list) {
    if (attachment.compatibleClass !== "ALL" && attachment.compatibleClass !== chassis) continue;
    damage *= attachment.modifiers.damageMultiplier;
    rate *= attachment.modifiers.fireRateMultiplier;
    recoil *= attachment.modifiers.recoilMultiplier;
    const override = attachment.modifiers.soundRadiusOverride;
    if (override != null && (sound == null || override < sound)) sound = override;
    if (attachment.specialPerkFlag) perks.push(attachment.specialPerkFlag);
    count += 1;
  }
  return { damage, rate, recoil, sound, perks, count };
}

function attachmentList(equipped: WeaponInstance["equippedAttachments"]): readonly AttachmentBlueprint[] {
  return equipped instanceof Map ? [...equipped.values()] : equipped;
}

export function compileRuntimeWeaponStats(weapon: WeaponInstance): CompiledRuntime {
  const list = attachmentList(weapon.equippedAttachments).map((row) => validateAttachmentJson(row));
  const stacked = applyValidAttachments(list, weapon.weaponId);
  return {
    runtimeDamage: weapon.baseStats.baseDamage * stacked.damage,
    runtimeFireRate: Math.max(8, weapon.baseStats.baseFireRate * stacked.rate),
    runtimeRecoil: weapon.baseStats.baseRecoil * stacked.recoil,
    runtimeSoundRadius: stacked.sound ?? weapon.baseStats.baseSoundRadius,
    activeGameplayModifiers: stacked.perks,
  };
}

/** Rejects a ticket whose attachments fail the seal. This is the local authority — one operator, not a remote queue. */
export function acceptDropTicket(ticket: DropTicket): SealedDrop {
  return {
    playerId: ticket.playerId,
    selectedCharacterId: ticket.selectedCharacterId,
    weapons: ticket.validatedWeaponLoadout.map((weapon) => compileRuntimeWeaponStats(weapon)),
  };
}

export function sealedModIds(ids: string[], chassis: string, lookup: (id: string) => unknown): string[] {
  const out: string[] = [];
  const used = new Set<string>();
  for (const id of ids) {
    const parsed = readAttachment(lookup(id));
    if (!parsed) continue;
    if (parsed.compatibleClass !== "ALL" && parsed.compatibleClass !== chassis) continue;
    if (used.has(parsed.slot)) continue;
    used.add(parsed.slot);
    out.push(parsed.attachmentId);
  }
  return out;
}

export class WeaponModCompiler {
  static validateAttachmentJson(payload: unknown) {
    return validateAttachmentJson(payload);
  }

  static compileRuntimeWeaponStats(weapon: WeaponInstance) {
    return compileRuntimeWeaponStats(weapon);
  }
}
