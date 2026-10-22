import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COIL_EMISSION,
  commitExtraction,
  emptyMars,
  modsForDrop,
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
});
