import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptDropTicket,
  type AttachmentBlueprint,
  type WeaponInstance,
  WeaponModCompiler,
} from "./weapon-mod.ts";

describe("WeaponModCompiler - Runtime Schema Validation", () => {
  it("parses a valid attachment blueprint", () => {
    const validPayload = {
      attachmentId: "att_shroud_barrel_01",
      slot: "BARREL",
      compatibleClass: "ALL",
      modifiers: {
        recoilMultiplier: 0.85,
        fireRateMultiplier: 1.0,
        damageMultiplier: 0.95,
      },
      specialPerkFlag: "ACOUSTIC_STEALTH_MASK",
    };
    const result = WeaponModCompiler.validateAttachmentJson(validPayload);
    assert.equal(result.attachmentId, "att_shroud_barrel_01");
    assert.equal(result.specialPerkFlag, "ACOUSTIC_STEALTH_MASK");
  });

  it("rejects a malformed attachment id", () => {
    const badIdPayload = {
      attachmentId: "MALICIOUS_HAX_MOD",
      slot: "RECEIVER",
      compatibleClass: "ALL",
      modifiers: { recoilMultiplier: 1.0, fireRateMultiplier: 1.0, damageMultiplier: 1.0 },
    };
    assert.throws(() => WeaponModCompiler.validateAttachmentJson(badIdPayload), /Invalid or malformed attachmentId/);
  });

  it("rejects multipliers outside the safety band", () => {
    const exploitPayload = {
      attachmentId: "att_exploit_mod_99",
      slot: "RECEIVER",
      compatibleClass: "ALL",
      modifiers: {
        recoilMultiplier: 0.05,
        fireRateMultiplier: 1.0,
        damageMultiplier: 2.99,
      },
    };
    assert.throws(() => WeaponModCompiler.validateAttachmentJson(exploitPayload), /violates safe range boundaries/);
  });
});

describe("WeaponModCompiler - Multiplicative stacking", () => {
  it("compounds multipliers across slots and keeps perk flags", () => {
    const mod1: AttachmentBlueprint = {
      attachmentId: "att_grip_01",
      slot: "UNDERBARREL",
      compatibleClass: "ALL",
      modifiers: { recoilMultiplier: 0.75, fireRateMultiplier: 1.0, damageMultiplier: 1.2 },
    };
    const mod2: AttachmentBlueprint = {
      attachmentId: "att_stock_02",
      slot: "MAGAZINE",
      compatibleClass: "ALL",
      modifiers: { recoilMultiplier: 0.75, fireRateMultiplier: 0.9, damageMultiplier: 1.0 },
      specialPerkFlag: "CAPACITY_DOUBLE",
    };
    const weaponMap = new Map<string, AttachmentBlueprint>();
    weaponMap.set("UNDERBARREL", mod1);
    weaponMap.set("MAGAZINE", mod2);
    const mockWeapon: WeaponInstance = {
      instanceId: "inst_test_01",
      weaponId: "ALL",
      baseStats: { baseDamage: 100, baseFireRate: 600, baseRecoil: 10.0, baseSoundRadius: 40.0 },
      equippedAttachments: weaponMap,
    };
    const compiled = WeaponModCompiler.compileRuntimeWeaponStats(mockWeapon);
    assert.equal(compiled.runtimeRecoil, 5.625);
    assert.equal(compiled.runtimeDamage, 120);
    assert.equal(compiled.runtimeFireRate, 540);
    assert.ok(compiled.activeGameplayModifiers.includes("CAPACITY_DOUBLE"));
  });

  it("does not apply a chassis-locked mod to the wrong gun", () => {
    const capacitor: AttachmentBlueprint = {
      attachmentId: "att_overcharged_capacitor_03",
      slot: "RECEIVER",
      compatibleClass: "ENERGY_RAIL",
      modifiers: { recoilMultiplier: 1.35, fireRateMultiplier: 0.6, damageMultiplier: 1.75 },
      specialPerkFlag: "ENV_MESH_PENETRATION",
    };
    const compiled = WeaponModCompiler.compileRuntimeWeaponStats({
      instanceId: "rifle",
      weaponId: "BALLISTIC",
      baseStats: { baseDamage: 24, baseFireRate: 620, baseRecoil: 0.018, baseSoundRadius: 36 },
      equippedAttachments: [capacitor],
    });
    assert.equal(compiled.runtimeDamage, 24);
    assert.equal(compiled.activeGameplayModifiers.length, 0);
  });
});

describe("drop ticket", () => {
  it("refuses a ticket that carries a bad blueprint", () => {
    assert.throws(
      () =>
        acceptDropTicket({
          playerId: "jaya",
          selectedCharacterId: "jaya",
          validatedWeaponLoadout: [
            {
              instanceId: "jaya:smg",
              weaponId: "BALLISTIC",
              baseStats: { baseDamage: 13, baseFireRate: 880, baseRecoil: 0.012, baseSoundRadius: 36 },
              equippedAttachments: [
                {
                  attachmentId: "MALICIOUS_HAX_MOD",
                  slot: "BARREL",
                  compatibleClass: "ALL",
                  modifiers: { recoilMultiplier: 0.1, fireRateMultiplier: 3, damageMultiplier: 3 },
                },
              ],
            },
          ],
        }),
      /Invalid or malformed attachmentId/,
    );
  });

  it("seals a clean ticket into compiled guns", () => {
    const sealed = acceptDropTicket({
      playerId: "khensu",
      selectedCharacterId: "khensu",
      validatedWeaponLoadout: [
        {
          instanceId: "khensu:rail",
          weaponId: "ENERGY_RAIL",
          baseStats: { baseDamage: 86, baseFireRate: 48, baseRecoil: 0.055, baseSoundRadius: 36 },
          equippedAttachments: [
            {
              attachmentId: "att_overcharged_capacitor_03",
              slot: "RECEIVER",
              compatibleClass: "ENERGY_RAIL",
              modifiers: { recoilMultiplier: 1.35, fireRateMultiplier: 0.6, damageMultiplier: 1.75 },
              specialPerkFlag: "ENV_MESH_PENETRATION",
            },
          ],
        },
      ],
    });
    assert.equal(sealed.weapons.length, 1);
    assert.equal(sealed.weapons[0]?.runtimeDamage, 150.5);
    assert.ok(Math.abs((sealed.weapons[0]?.runtimeFireRate ?? 0) - 28.8) < 1e-6);
    assert.ok(sealed.weapons[0]?.activeGameplayModifiers.includes("ENV_MESH_PENETRATION"));
  });
});
