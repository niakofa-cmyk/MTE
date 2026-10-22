import type { OpId, WeaponId } from "./content.ts";

/** 18-byte little-endian gear snapshot. Gameplay stats stay on the sealed gun; this is the compact copy. */
export const GEAR_PACKET_BYTES = 18;

export const CHARACTER_CODE: Record<OpId, number> = {
  jaya: 101,
  bodhi: 102,
  aset: 103,
  khensu: 201,
  nefret: 202,
  ananda: 301,
};

export const WEAPON_CODE: Record<WeaponId, number> = {
  rifle: 501,
  smg: 502,
  shotgun: 503,
  lmg: 504,
  pistol: 505,
  slug: 506,
  rail: 601,
  needles: 602,
};

export const MOD_CODE: Record<string, number> = {
  att_shroud_barrel_01: 1001,
  att_heavy_stabilizer_02: 12,
  att_overcharged_capacitor_03: 3003,
  att_lightweight_burst_04: 22,
  att_holo_tactical_05: 5005,
  att_chrono_tracer_scope_06: 32,
  att_extended_drum_07: 41,
};

const MOD_PACK_ORDER = [
  "att_shroud_barrel_01",
  "att_heavy_stabilizer_02",
  "att_holo_tactical_05",
  "att_chrono_tracer_scope_06",
  "att_overcharged_capacitor_03",
  "att_lightweight_burst_04",
  "att_extended_drum_07",
];

export type UnpackedPlayerGearData = {
  playerId: number;
  characterId: number;
  primaryWeaponId: number;
  equippedModIds: number[];
  runtimeRecoilFactor: number;
  runtimeDamageValue: number;
};

function clampU16(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(65535, Math.floor(value));
}

export function modCodes(modIds: string[]) {
  const have = new Set(modIds);
  const codes: number[] = [];
  for (const id of MOD_PACK_ORDER) {
    if (!have.has(id)) continue;
    const code = MOD_CODE[id];
    if (code) codes.push(code);
  }
  return codes;
}

export function serializeGearPacket(data: UnpackedPlayerGearData): ArrayBuffer {
  const buffer = new ArrayBuffer(GEAR_PACKET_BYTES);
  const view = new DataView(buffer);
  const playerId = Number.isFinite(data.playerId) ? data.playerId : 0;
  view.setUint32(0, playerId >>> 0, true);
  view.setUint16(4, clampU16(data.characterId), true);
  view.setUint16(6, clampU16(data.primaryWeaponId), true);
  for (let i = 0; i < 3; i++) view.setUint16(8 + i * 2, clampU16(data.equippedModIds[i] ?? 0), true);
  view.setUint16(14, clampU16(Math.floor(data.runtimeRecoilFactor * 100)), true);
  view.setUint16(16, clampU16(Math.floor(data.runtimeDamageValue)), true);
  return buffer;
}

export function deserializeGearPacket(buffer: ArrayBuffer): UnpackedPlayerGearData {
  if (buffer.byteLength !== GEAR_PACKET_BYTES) throw new Error("gear packet must be 18 bytes");
  const view = new DataView(buffer);
  const equippedModIds: number[] = [];
  for (let i = 0; i < 3; i++) {
    const modId = view.getUint16(8 + i * 2, true);
    if (modId !== 0) equippedModIds.push(modId);
  }
  return {
    playerId: view.getUint32(0, true),
    characterId: view.getUint16(4, true),
    primaryWeaponId: view.getUint16(6, true),
    equippedModIds,
    runtimeRecoilFactor: view.getUint16(14, true) / 100,
    runtimeDamageValue: view.getUint16(16, true),
  };
}

export function packHeldGear(input: {
  playerId: number;
  operator: OpId;
  weapon: WeaponId;
  modIds: string[];
  runtimeRecoilFactor: number;
  runtimeDamageValue: number;
}): ArrayBuffer {
  return serializeGearPacket({
    playerId: input.playerId,
    characterId: CHARACTER_CODE[input.operator],
    primaryWeaponId: WEAPON_CODE[input.weapon],
    equippedModIds: modCodes(input.modIds).slice(0, 3),
    runtimeRecoilFactor: input.runtimeRecoilFactor,
    runtimeDamageValue: input.runtimeDamageValue,
  });
}
