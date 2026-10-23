import assert from "node:assert/strict";
import test from "node:test";
import {
  MTEAuthoritativeAbilityManager,
  MTEWeaponTelemetryEngine,
  REFERENCE_ABILITY_REGISTRY,
} from "../src/lib/authoritative-combat-systems.ts";

const weaponCatalog = {
  weapons: [
    {
      weaponId: "rifle",
      name: "VEIL RIFLE",
      weaponClass: "BALLISTIC",
      baseDamage: 24,
      fireRateRpm: 620,
      maxClipSize: 30,
      baseRecoil: 0.018,
      maxEffectiveRange: 110,
    },
    {
      weaponId: "rail",
      name: "HORIZON RAIL",
      weaponClass: "ENERGY_RAIL",
      baseDamage: 86,
      fireRateRpm: 48,
      maxClipSize: 5,
      baseRecoil: 0.055,
      maxEffectiveRange: 180,
    },
  ],
  attachments: [
    {
      attachmentId: "att_lightweight_burst_04",
      slot: "RECEIVER",
      compatibleClass: "BALLISTIC",
      modifiers: {
        damageMultiplier: 0.8,
        fireRateMultiplier: 1.5,
        recoilMultiplier: 0.9,
      },
      specialPerkFlag: "SLIDE_ACCURACY_BUFF",
    },
    {
      attachmentId: "att_extended_drum_07",
      slot: "MAGAZINE",
      compatibleClass: "BALLISTIC",
      modifiers: {
        damageMultiplier: 1,
        fireRateMultiplier: 1,
        recoilMultiplier: 1.15,
      },
      specialPerkFlag: "CAPACITY_DOUBLE",
    },
    {
      attachmentId: "att_overcharged_capacitor_03",
      slot: "RECEIVER",
      compatibleClass: "ENERGY_RAIL",
      modifiers: {
        damageMultiplier: 1.75,
        fireRateMultiplier: 0.6,
        recoilMultiplier: 1.35,
      },
      specialPerkFlag: "ENV_MESH_PENETRATION",
    },
  ],
};

test("compiles server-catalogued weapon stats and safe fire interval", () => {
  const profile = MTEWeaponTelemetryEngine.calculateRuntimeProfile(
    {
      weaponId: "rifle",
      equippedAttachmentIds: [
        "att_lightweight_burst_04",
        "att_extended_drum_07",
      ],
    },
    weaponCatalog,
  );

  assert.equal(profile.damage, 19.200000000000003);
  assert.equal(profile.fireRateRpm, 930);
  assert.equal(profile.fireIntervalMs, 60_000 / 930);
  assert.equal(profile.maxClipSize, 60);
  assert.equal(profile.activeGameplayModifiers.length, 2);
  assert.equal(Object.isFrozen(profile), true);
});

test("rejects client-invented stats, unknown attachments, duplicate slots, and incompatible mods", () => {
  assert.throws(
    () =>
      MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        { weaponId: "forged_weapon", equippedAttachmentIds: [] },
        weaponCatalog,
      ),
    /Unknown server weapon ID/,
  );
  assert.throws(
    () =>
      MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        { weaponId: "rifle", equippedAttachmentIds: ["att_client_invented_99"] },
        weaponCatalog,
      ),
    /Unknown server attachment ID/,
  );
  assert.throws(
    () =>
      MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        {
          weaponId: "rifle",
          equippedAttachmentIds: [
            "att_lightweight_burst_04",
            "att_overcharged_capacitor_03",
          ],
        },
        weaponCatalog,
      ),
    /two attachments in one slot/,
  );
  assert.throws(
    () =>
      MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        { weaponId: "rifle", equippedAttachmentIds: ["att_overcharged_capacitor_03"] },
        weaponCatalog,
      ),
    /incompatible/,
  );
});

test("rejects unsafe weapon and attachment values in the trusted catalog", () => {
  const invalidWeaponCatalog = structuredClone(weaponCatalog);
  invalidWeaponCatalog.weapons[0].baseDamage = Number.POSITIVE_INFINITY;
  assert.throws(
    () =>
      MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        { weaponId: "rifle", equippedAttachmentIds: [] },
        invalidWeaponCatalog,
      ),
    /base damage/,
  );

  const invalidAttachmentCatalog = structuredClone(weaponCatalog);
  invalidAttachmentCatalog.attachments[0].modifiers.fireRateMultiplier = 30;
  assert.throws(
    () =>
      MTEWeaponTelemetryEngine.calculateRuntimeProfile(
        { weaponId: "rifle", equippedAttachmentIds: ["att_lightweight_burst_04"] },
        invalidAttachmentCatalog,
      ),
    /fire-rate multiplier/,
  );
});

test("server ability state starts ready, rejects repeat activation, and expires on server time", () => {
  const state = MTEAuthoritativeAbilityManager.createDefaultState(
    "DECOY_CLONE",
    REFERENCE_ABILITY_REGISTRY,
  );

  assert.equal(MTEAuthoritativeAbilityManager.executeActivationTrigger(state), true);
  assert.equal(state.isActive, true);
  assert.equal(state.cooldownRemainingSec, 25);
  assert.equal(MTEAuthoritativeAbilityManager.executeActivationTrigger(state), false);

  MTEAuthoritativeAbilityManager.advanceAbilityTimeline(state, 0.25);
  assert.equal(state.activeDurationRemainingSec, 4.75);
  assert.equal(state.cooldownRemainingSec, 24.75);
  for (let tick = 0; tick < 19; tick += 1) {
    MTEAuthoritativeAbilityManager.advanceAbilityTimeline(state, 0.25);
  }
  assert.equal(state.isActive, false);
  assert.equal(state.activeDurationRemainingSec, 0);
});

test("instant server abilities start cooldown without entering an active window", () => {
  const registry = {
    ...REFERENCE_ABILITY_REGISTRY,
    FOOTPRINT_TRACKER: {
      cooldownMaxSec: 20,
      activeDurationMaxSec: 0,
    },
  };
  const state = MTEAuthoritativeAbilityManager.createDefaultState(
    "FOOTPRINT_TRACKER",
    registry,
  );
  assert.equal(MTEAuthoritativeAbilityManager.executeActivationTrigger(state, registry), true);
  assert.equal(state.isActive, false);
  assert.equal(state.cooldownRemainingSec, 20);
});

test("ability timeline rejects invalid deltas and bounds long server hitches", () => {
  const state = MTEAuthoritativeAbilityManager.createDefaultState("FOOTPRINT_TRACKER");
  MTEAuthoritativeAbilityManager.executeActivationTrigger(state);
  assert.throws(
    () => MTEAuthoritativeAbilityManager.advanceAbilityTimeline(state, -1),
    /finite and non-negative/,
  );
  MTEAuthoritativeAbilityManager.advanceAbilityTimeline(state, 10);
  assert.equal(state.cooldownRemainingSec, 19.75);
});
