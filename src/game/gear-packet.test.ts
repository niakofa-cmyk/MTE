import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHARACTER_CODE,
  GEAR_PACKET_BYTES,
  WEAPON_CODE,
  deserializeGearPacket,
  modCodes,
  packHeldGear,
  serializeGearPacket,
} from "./gear-packet.ts";

describe("gear packet", () => {
  it("packs a held gun into 18 bytes and unpacks the quantized fields", () => {
    const buffer = serializeGearPacket({
      playerId: 7,
      characterId: CHARACTER_CODE.jaya,
      primaryWeaponId: WEAPON_CODE.rifle,
      equippedModIds: [1001, 3003, 5005],
      runtimeRecoilFactor: 5.625,
      runtimeDamageValue: 120,
    });
    assert.equal(buffer.byteLength, GEAR_PACKET_BYTES);
    const gear = deserializeGearPacket(buffer);
    assert.equal(gear.playerId, 7);
    assert.equal(gear.characterId, 101);
    assert.equal(gear.primaryWeaponId, 501);
    assert.deepEqual(gear.equippedModIds, [1001, 3003, 5005]);
    assert.equal(gear.runtimeRecoilFactor, 5.62);
    assert.equal(gear.runtimeDamageValue, 120);
  });

  it("keeps Nefret and the rail on their assigned codes", () => {
    const gear = deserializeGearPacket(
      packHeldGear({
        playerId: 1,
        operator: "nefret",
        weapon: "rail",
        modIds: ["att_overcharged_capacitor_03"],
        runtimeRecoilFactor: 0.07425,
        runtimeDamageValue: 150.5,
      }),
    );
    assert.equal(gear.characterId, 202);
    assert.equal(gear.primaryWeaponId, 601);
    assert.deepEqual(gear.equippedModIds, [3003]);
    assert.equal(gear.runtimeDamageValue, 150);
  });

  it("writes only three mod slots and pads empties", () => {
    const codes = modCodes([
      "att_extended_drum_07",
      "att_holo_tactical_05",
      "att_heavy_stabilizer_02",
      "att_lightweight_burst_04",
      "MALICIOUS_HAX_MOD",
    ]);
    assert.deepEqual(codes, [12, 5005, 22, 41]);
    const gear = deserializeGearPacket(
      packHeldGear({
        playerId: 1,
        operator: "bodhi",
        weapon: "smg",
        modIds: [
          "att_extended_drum_07",
          "att_holo_tactical_05",
          "att_heavy_stabilizer_02",
          "att_lightweight_burst_04",
        ],
        runtimeRecoilFactor: 0.012,
        runtimeDamageValue: 13,
      }),
    );
    assert.equal(gear.characterId, 102);
    assert.equal(gear.primaryWeaponId, 502);
    assert.deepEqual(gear.equippedModIds, [12, 5005, 22]);
    assert.equal(gear.runtimeRecoilFactor, 0.01);
  });

  it("rejects a short buffer", () => {
    assert.throws(() => deserializeGearPacket(new ArrayBuffer(8)), /18 bytes/);
  });

  it("clamps a blown damage word", () => {
    const gear = deserializeGearPacket(
      serializeGearPacket({
        playerId: -4,
        characterId: 999999,
        primaryWeaponId: WEAPON_CODE.needles,
        equippedModIds: [0, 41],
        runtimeRecoilFactor: -2,
        runtimeDamageValue: 99999,
      }),
    );
    assert.equal(gear.playerId, 4294967292);
    assert.equal(gear.characterId, 65535);
    assert.equal(gear.primaryWeaponId, 602);
    assert.deepEqual(gear.equippedModIds, [41]);
    assert.equal(gear.runtimeRecoilFactor, 0);
    assert.equal(gear.runtimeDamageValue, 65535);
  });
});
