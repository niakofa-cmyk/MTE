export const ATTACHMENT_SLOTS = [
  "BARREL",
  "RECEIVER",
  "OPTIC",
  "UNDERBARREL",
  "MAGAZINE",
] as const;

export const WEAPON_CLASSES = ["BALLISTIC", "ENERGY_RAIL"] as const;
export const GAMEPLAY_PERKS = [
  "ACOUSTIC_STEALTH_MASK",
  "FLINCH_IMMUNITY",
  "ENV_MESH_PENETRATION",
  "SLIDE_ACCURACY_BUFF",
  "SKILLSHOT_HIGHLIGHT",
  "TRACK_TRAIL_VISIBILITY",
  "CAPACITY_DOUBLE",
] as const;

export type AttachmentSlot = (typeof ATTACHMENT_SLOTS)[number];
export type WeaponClass = (typeof WEAPON_CLASSES)[number];
export type GameplayPerk = (typeof GAMEPLAY_PERKS)[number];

export interface BaseWeaponProfile {
  weaponId: string;
  name: string;
  weaponClass: WeaponClass;
  baseDamage: number;
  fireRateRpm: number;
  maxClipSize: number;
  baseRecoil: number;
  maxEffectiveRange: number;
}

export interface AttachmentProfile {
  attachmentId: string;
  slot: AttachmentSlot;
  compatibleClass: WeaponClass | "ALL";
  modifiers: {
    damageMultiplier: number;
    fireRateMultiplier: number;
    recoilMultiplier: number;
    rangeMultiplier?: number;
    soundRadiusOverride?: number;
  };
  specialPerkFlag?: GameplayPerk;
}

export interface ServerWeaponCatalog {
  weapons: readonly BaseWeaponProfile[];
  attachments: readonly AttachmentProfile[];
}

export interface ActiveWeaponConfiguration {
  weaponId: string;
  equippedAttachmentIds: readonly string[];
}

export interface RuntimeWeaponProfile {
  weaponId: string;
  name: string;
  weaponClass: WeaponClass;
  damage: number;
  fireRateRpm: number;
  fireIntervalMs: number;
  maxClipSize: number;
  recoil: number;
  maxEffectiveRange: number;
  soundRadius: number;
  activeGameplayModifiers: readonly GameplayPerk[];
}

const ATTACHMENT_ID = /^att_[a-z0-9_]{3,40}$/;
const WEAPON_ID = /^[a-z][a-z0-9_]{0,31}$/;
const MAX_ATTACHMENTS = ATTACHMENT_SLOTS.length;
const MAX_WEAPONS_IN_CATALOG = 64;
const MAX_ATTACHMENTS_IN_CATALOG = 256;
const MAX_DAMAGE = 500;
const MAX_FIRE_RATE_RPM = 2_000;
const MAX_CLIP_SIZE = 500;
const MAX_EFFECTIVE_RANGE = 1_000;

function finiteInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${label} is outside its safe range.`);
  }
  return value;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function validateWeapon(profile: BaseWeaponProfile): void {
  if (
    !profile ||
    typeof profile !== "object" ||
    !hasOnlyKeys(profile as unknown as Record<string, unknown>, [
      "weaponId",
      "name",
      "weaponClass",
      "baseDamage",
      "fireRateRpm",
      "maxClipSize",
      "baseRecoil",
      "maxEffectiveRange",
    ]) ||
    typeof profile.weaponId !== "string" ||
    !WEAPON_ID.test(profile.weaponId) ||
    typeof profile.name !== "string" ||
    profile.name.length < 1 ||
    profile.name.length > 80 ||
    !WEAPON_CLASSES.includes(profile.weaponClass)
  ) {
    throw new Error("The server weapon catalog contains an invalid profile.");
  }
  finiteInRange(profile.baseDamage, 1, MAX_DAMAGE, "base damage");
  finiteInRange(profile.fireRateRpm, 10, MAX_FIRE_RATE_RPM, "base fire rate");
  finiteInRange(profile.maxClipSize, 1, MAX_CLIP_SIZE, "base clip size");
  finiteInRange(profile.baseRecoil, 0, 10, "base recoil");
  finiteInRange(profile.maxEffectiveRange, 1, MAX_EFFECTIVE_RANGE, "base range");
}

function validateAttachment(attachment: AttachmentProfile): void {
  if (
    !attachment ||
    typeof attachment !== "object" ||
    !hasOnlyKeys(attachment as unknown as Record<string, unknown>, [
      "attachmentId",
      "slot",
      "compatibleClass",
      "modifiers",
      "specialPerkFlag",
    ]) ||
    typeof attachment.attachmentId !== "string" ||
    !ATTACHMENT_ID.test(attachment.attachmentId) ||
    !ATTACHMENT_SLOTS.includes(attachment.slot) ||
    (attachment.compatibleClass !== "ALL" &&
      !WEAPON_CLASSES.includes(attachment.compatibleClass))
  ) {
    throw new Error("The server attachment catalog contains an invalid profile.");
  }
  if (
    !attachment.modifiers ||
    typeof attachment.modifiers !== "object" ||
    !hasOnlyKeys(attachment.modifiers, [
      "damageMultiplier",
      "fireRateMultiplier",
      "recoilMultiplier",
      "rangeMultiplier",
      "soundRadiusOverride",
    ])
  ) {
    throw new Error("The server attachment catalog contains invalid modifiers.");
  }

  finiteInRange(
    attachment.modifiers?.damageMultiplier,
    0.1,
    3,
    "attachment damage multiplier",
  );
  finiteInRange(
    attachment.modifiers?.fireRateMultiplier,
    0.1,
    3,
    "attachment fire-rate multiplier",
  );
  finiteInRange(
    attachment.modifiers?.recoilMultiplier,
    0.1,
    3,
    "attachment recoil multiplier",
  );
  if (attachment.modifiers.rangeMultiplier !== undefined) {
    finiteInRange(
      attachment.modifiers.rangeMultiplier,
      0.1,
      3,
      "attachment range multiplier",
    );
  }
  if (attachment.modifiers.soundRadiusOverride !== undefined) {
    finiteInRange(
      attachment.modifiers.soundRadiusOverride,
      0,
      100,
      "attachment sound radius",
    );
  }
  if (
    attachment.specialPerkFlag !== undefined &&
    !GAMEPLAY_PERKS.includes(attachment.specialPerkFlag)
  ) {
    throw new Error("The server attachment catalog contains an unknown perk.");
  }
}

function validateCatalog(catalog: ServerWeaponCatalog): void {
  if (
    !catalog ||
    !Array.isArray(catalog.weapons) ||
    catalog.weapons.length === 0 ||
    catalog.weapons.length > MAX_WEAPONS_IN_CATALOG ||
    !Array.isArray(catalog.attachments) ||
    catalog.attachments.length > MAX_ATTACHMENTS_IN_CATALOG
  ) {
    throw new Error("The server weapon catalog has invalid record counts.");
  }

  const weaponIds = new Set<string>();
  for (const weapon of catalog.weapons) {
    validateWeapon(weapon);
    if (weaponIds.has(weapon.weaponId)) {
      throw new Error("The server weapon catalog contains a duplicate weapon ID.");
    }
    weaponIds.add(weapon.weaponId);
  }

  const attachmentIds = new Set<string>();
  for (const attachment of catalog.attachments) {
    validateAttachment(attachment);
    if (attachmentIds.has(attachment.attachmentId)) {
      throw new Error("The server weapon catalog contains a duplicate attachment ID.");
    }
    attachmentIds.add(attachment.attachmentId);
  }
}

export class MTEWeaponTelemetryEngine {
  /**
   * Resolve attachment IDs only against trusted server catalog entries.
   * Call on loadout changes, not inside the per-frame simulation loop.
   */
  static calculateRuntimeProfile(
    configuration: ActiveWeaponConfiguration,
    catalog: ServerWeaponCatalog,
  ): RuntimeWeaponProfile {
    validateCatalog(catalog);
    if (
      !configuration ||
      typeof configuration !== "object" ||
      !hasOnlyKeys(configuration as unknown as Record<string, unknown>, [
        "weaponId",
        "equippedAttachmentIds",
      ]) ||
      typeof configuration.weaponId !== "string" ||
      !Array.isArray(configuration.equippedAttachmentIds)
    ) {
      throw new Error("Weapon configuration has an invalid schema.");
    }
    const weapon = catalog.weapons.find(
      (candidate) => candidate.weaponId === configuration.weaponId,
    );
    if (!weapon) throw new Error("Unknown server weapon ID.");
    validateWeapon(weapon);

    if (
      !Array.isArray(configuration.equippedAttachmentIds) ||
      configuration.equippedAttachmentIds.length > MAX_ATTACHMENTS
    ) {
      throw new Error("Weapon loadout has an invalid attachment count.");
    }

    let damageMultiplier = 1;
    let fireRateMultiplier = 1;
    let recoilMultiplier = 1;
    let rangeMultiplier = 1;
    let soundRadius: number | undefined;
    const usedSlots = new Set<AttachmentSlot>();
    const activePerks = new Set<GameplayPerk>();

    for (const attachmentId of configuration.equippedAttachmentIds) {
      const attachment = catalog.attachments.find(
        (candidate) => candidate.attachmentId === attachmentId,
      );
      if (!attachment) throw new Error("Unknown server attachment ID.");
      validateAttachment(attachment);
      if (usedSlots.has(attachment.slot)) {
        throw new Error("A loadout cannot equip two attachments in one slot.");
      }
      usedSlots.add(attachment.slot);
      if (
        attachment.compatibleClass !== "ALL" &&
        attachment.compatibleClass !== weapon.weaponClass
      ) {
        throw new Error("Attachment is incompatible with the server weapon.");
      }

      damageMultiplier *= attachment.modifiers.damageMultiplier;
      fireRateMultiplier *= attachment.modifiers.fireRateMultiplier;
      recoilMultiplier *= attachment.modifiers.recoilMultiplier;
      rangeMultiplier *= attachment.modifiers.rangeMultiplier ?? 1;
      if (
        attachment.modifiers.soundRadiusOverride !== undefined &&
        (soundRadius === undefined ||
          attachment.modifiers.soundRadiusOverride < soundRadius)
      ) {
        soundRadius = attachment.modifiers.soundRadiusOverride;
      }
      if (attachment.specialPerkFlag) activePerks.add(attachment.specialPerkFlag);
    }

    const damage = weapon.baseDamage * damageMultiplier;
    const fireRateRpm = Math.min(
      MAX_FIRE_RATE_RPM,
      weapon.fireRateRpm * fireRateMultiplier,
    );
    const maxClipSize = Math.min(
      MAX_CLIP_SIZE,
      Math.max(
        1,
        Math.round(
          weapon.maxClipSize *
            (activePerks.has("CAPACITY_DOUBLE") ? 2 : 1),
        ),
      ),
    );
    const recoil = weapon.baseRecoil * recoilMultiplier;
    const maxEffectiveRange = Math.min(
      MAX_EFFECTIVE_RANGE,
      weapon.maxEffectiveRange * rangeMultiplier,
    );

    if (
      !Number.isFinite(damage) ||
      damage < 1 ||
      damage > MAX_DAMAGE ||
      !Number.isFinite(recoil) ||
      recoil > 30
    ) {
      throw new Error("Compiled weapon profile exceeds safe runtime limits.");
    }

    return Object.freeze({
      weaponId: weapon.weaponId,
      name: weapon.name,
      weaponClass: weapon.weaponClass,
      damage,
      fireRateRpm,
      fireIntervalMs: Math.max(30, 60_000 / fireRateRpm),
      maxClipSize,
      recoil,
      maxEffectiveRange,
      soundRadius: soundRadius ?? 36,
      activeGameplayModifiers: Object.freeze([...activePerks]),
    });
  }
}

export const ABILITY_TYPES = [
  "FOOTPRINT_TRACKER",
  "COMPACT_PORTAL",
  "DECOY_CLONE",
] as const;

export type AbilityType = (typeof ABILITY_TYPES)[number];

export interface AbilityDefinition {
  cooldownMaxSec: number;
  activeDurationMaxSec: number;
}

export type AbilityRegistry = Readonly<Record<AbilityType, AbilityDefinition>>;

export interface PlayerAbilityState {
  abilityId: AbilityType;
  cooldownMaxSec: number;
  cooldownRemainingSec: number;
  activeDurationMaxSec: number;
  activeDurationRemainingSec: number;
  isActive: boolean;
}

export const REFERENCE_ABILITY_REGISTRY: AbilityRegistry = Object.freeze({
  FOOTPRINT_TRACKER: Object.freeze({
    cooldownMaxSec: 20,
    activeDurationMaxSec: 6,
  }),
  COMPACT_PORTAL: Object.freeze({
    cooldownMaxSec: 35,
    activeDurationMaxSec: 4,
  }),
  DECOY_CLONE: Object.freeze({
    cooldownMaxSec: 25,
    activeDurationMaxSec: 5,
  }),
});

const MAX_ABILITY_TICK_SECONDS = 0.25;

export class MTEAuthoritativeAbilityManager {
  static createDefaultState(
    abilityId: AbilityType,
    registry: AbilityRegistry = REFERENCE_ABILITY_REGISTRY,
  ): PlayerAbilityState {
    const definition = registry[abilityId];
    if (!definition) throw new Error("Unknown server ability ID.");
    finiteInRange(definition.cooldownMaxSec, 0, 600, "ability cooldown");
    finiteInRange(definition.activeDurationMaxSec, 0, 120, "ability duration");
    return {
      abilityId,
      cooldownMaxSec: definition.cooldownMaxSec,
      cooldownRemainingSec: 0,
      activeDurationMaxSec: definition.activeDurationMaxSec,
      activeDurationRemainingSec: 0,
      isActive: false,
    };
  }

  static executeActivationTrigger(
    state: PlayerAbilityState,
    registry: AbilityRegistry = REFERENCE_ABILITY_REGISTRY,
  ): boolean {
    if (
      !state ||
      !ABILITY_TYPES.includes(state.abilityId) ||
      typeof state.isActive !== "boolean"
    ) {
      throw new Error("Ability state has an invalid schema.");
    }
    const definition = registry[state.abilityId];
    if (!definition) throw new Error("Unknown server ability ID.");
    finiteInRange(definition.cooldownMaxSec, 0, 600, "ability cooldown");
    finiteInRange(definition.activeDurationMaxSec, 0, 120, "ability duration");
    finiteInRange(state.cooldownRemainingSec, 0, 600, "remaining ability cooldown");
    finiteInRange(
      state.activeDurationRemainingSec,
      0,
      120,
      "remaining ability duration",
    );
    if (state.cooldownRemainingSec > 0 || state.isActive) return false;

    state.cooldownMaxSec = definition.cooldownMaxSec;
    state.activeDurationMaxSec = definition.activeDurationMaxSec;
    state.cooldownRemainingSec = definition.cooldownMaxSec;
    state.activeDurationRemainingSec = definition.activeDurationMaxSec;
    state.isActive = definition.activeDurationMaxSec > 0;
    return true;
  }

  static advanceAbilityTimeline(state: PlayerAbilityState, deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error("Ability tick delta must be finite and non-negative.");
    }
    if (
      !state ||
      !ABILITY_TYPES.includes(state.abilityId) ||
      typeof state.isActive !== "boolean"
    ) {
      throw new Error("Ability state has an invalid schema.");
    }
    finiteInRange(state.cooldownRemainingSec, 0, 600, "remaining ability cooldown");
    finiteInRange(
      state.activeDurationRemainingSec,
      0,
      120,
      "remaining ability duration",
    );
    const boundedDelta = Math.min(deltaSeconds, MAX_ABILITY_TICK_SECONDS);

    if (state.isActive) {
      state.activeDurationRemainingSec = Math.max(
        0,
        state.activeDurationRemainingSec - boundedDelta,
      );
      if (state.activeDurationRemainingSec === 0) state.isActive = false;
    }
    state.cooldownRemainingSec = Math.max(
      0,
      state.cooldownRemainingSec - boundedDelta,
    );
  }
}
