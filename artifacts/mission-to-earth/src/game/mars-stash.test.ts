import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COIL_EMISSION,
  commitExtraction,
  emptyMars,
  loadMars,
  modsForDrop,
  parseMarsProfile,
  saveMars,
  serializeMarsProfile,
  setPresetMod,
  solarCoilEmits,
} from "./mars-stash.ts";

describe("mars stash", () => {
  it("banks credits and stacks a filed blueprint", () => {
    const once = commitExtraction(emptyMars(), 950, [{ itemRegistryId: "att_chrono_tracer_scope_06", sectorTier: 4 }]);
    const twice = commitExtraction(once, 50, [{ itemRegistryId: "att_chrono_tracer_scope_06", sectorTier: 4 }]);
    assert.equal(twice.martianCredits, 1000);
    assert.deepEqual(twice.unlockedBlueprints, ["att_chrono_tracer_scope_06"]);
    assert.equal(twice.stash.length, 1);
    assert.equal(twice.stash[0]?.quantity, 2);
    assert.equal(twice.stash[0]?.extractedFromSectorId, 4);
  });

  it("does not unlock a weapon as a gun mod", () => {
    const next = commitExtraction(emptyMars(), 0, [{ itemRegistryId: "intel_pure_blood_dna", sectorTier: 4 }]);
    assert.deepEqual(next.unlockedBlueprints, []);
    assert.equal(next.stash[0]?.itemRegistryId, "intel_pure_blood_dna");
  });

  it("sends only class-legal filed mods down with the gun", () => {
    let profile = commitExtraction(emptyMars(), 0, [
      { itemRegistryId: "att_holo_tactical_05", sectorTier: 2 },
      { itemRegistryId: "att_overcharged_capacitor_03", sectorTier: 4 },
    ]);
    profile = setPresetMod(profile, "opticModId", "att_holo_tactical_05", "smg");
    profile = setPresetMod(profile, "receiverModId", "att_overcharged_capacitor_03", "smg");
    assert.deepEqual(modsForDrop(profile, "smg"), ["att_holo_tactical_05"]);
    assert.deepEqual(modsForDrop(profile, "rail"), ["att_overcharged_capacitor_03", "att_holo_tactical_05"]);
  });

  it("treats the solar coil as a self-emitter and the shroud as matte", () => {
    assert.equal(solarCoilEmits(0xe6 / 255, 0x80 / 255, 0x1a / 255), true);
    assert.equal(solarCoilEmits(0x1a / 255, 0x1a / 255, 0x1a / 255), false);
    assert.equal(COIL_EMISSION, 1.8);
  });

  it("round-trips a versioned profile and migrates the legacy direct profile shape", () => {
    const profile = commitExtraction(emptyMars(), 250, [
      { itemRegistryId: "att_shroud_barrel_01", sectorTier: 2 },
    ]);
    assert.deepEqual(parseMarsProfile(serializeMarsProfile(profile)), profile);
    assert.deepEqual(parseMarsProfile(JSON.stringify(profile)), profile);
  });

  it("sanitizes edited credits, unknown items, invalid mods, and out-of-range values", () => {
    const profile = parseMarsProfile(JSON.stringify({
      martianCredits: "99999",
      unlockedBlueprints: ["att_shroud_barrel_01", "__proto__"],
      stash: [
        { stashItemUuid: "one", itemRegistryId: "intel_pure_blood_dna", quantity: -5, currentDurability: 900, extractedFromSectorId: 99 },
        { stashItemUuid: "two", itemRegistryId: "intel_pure_blood_dna", quantity: 2 },
        { stashItemUuid: "three", itemRegistryId: "made_up_item", quantity: 1 },
      ],
      activeSlot: 9,
      loadouts: [{
        slotIndex: 1,
        baseWeaponId: "made_up_weapon",
        barrelModId: "att_holo_tactical_05",
        receiverModId: "att_overcharged_capacitor_03",
      }],
    }));
    assert.ok(profile);
    assert.equal(profile.martianCredits, 0);
    assert.deepEqual(profile.unlockedBlueprints, ["att_shroud_barrel_01"]);
    assert.equal(profile.stash.length, 1);
    assert.equal(profile.stash[0]?.quantity, 3);
    assert.equal(profile.stash[0]?.currentDurability, 100);
    assert.equal(profile.stash[0]?.extractedFromSectorId, 4);
    assert.equal(profile.activeSlot, 1);
    assert.equal(profile.loadouts[0]?.baseWeaponId, "");
    assert.equal(profile.loadouts[0]?.barrelModId, null);
    assert.equal(profile.loadouts[0]?.receiverModId, "att_overcharged_capacitor_03");
  });

  it("recovers a corrupt primary save from its local backup", () => {
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    try {
      const profile = commitExtraction(emptyMars(), 420, []);
      assert.equal(saveMars(profile), true);
      values.set("mte-mars-v2", "corrupt");
      assert.equal(loadMars().martianCredits, 420);
    } finally {
      if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
      else delete (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    }
  });

  it("loads the legacy mte-mars-v1 browser save without changing its key contract", () => {
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const profile = commitExtraction(emptyMars(), 315, []);
    const values = new Map<string, string>([["mte-mars-v1", JSON.stringify(profile)]]);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    try {
      assert.equal(loadMars().martianCredits, 315);
    } finally {
      if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
      else delete (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    }
  });

  it("reports when browser storage rejects a profile write", () => {
    const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => { throw new Error("storage full"); },
      },
    });
    try {
      assert.equal(saveMars(emptyMars()), false);
    } finally {
      if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
      else delete (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    }
  });
});
