import assert from "node:assert/strict";
import test from "node:test";
import { exportGameplayRegistry, serializeGameplayRegistry } from "./gameplay-registry-export.ts";

test("gameplay registry exports mission loot, terminals, and objective chain", () => {
  const registry = exportGameplayRegistry({
    loots: [
      { kind: "weapon", weaponId: "rifle", x: 20, z: 24, label: "INFANTRY RIFLE", scrap: 150 },
      { kind: "ammo", x: -10, z: 4 },
    ],
    terminals: [{ x: 60, z: 20 }, { x: -60, z: 50 }],
    sites: [
      {
        id: "alpha",
        lineage: "Ananda",
        x: 80,
        z: -80,
        door: { minX: 78, maxX: 82, minZ: -66, maxZ: -64, maxHp: 150 },
      },
      {
        id: "omega",
        lineage: "Nefret",
        x: -80,
        z: 80,
        door: { minX: -82, maxX: -78, minZ: 64, maxZ: 66, maxHp: 150 },
      },
    ],
    beacon: { x: 0, z: 0 },
    extract: { x: 0, z: -138 },
  });

  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.lootSpawns.length, 2);
  assert.equal(registry.terminals.length, 2);
  assert.equal(registry.objectives.length, 4);
  assert.equal(registry.terminalLootTable.length, 7);
  assert.equal(registry.objectives[0]?.target, "Ananda");
  assert.equal(registry.objectives[1]?.target, "Nefret");
  assert.deepEqual(registry.objectives[2]?.prerequisites, ["rescue-alpha", "rescue-omega"]);
  assert.deepEqual(registry.objectives[3]?.prerequisites, ["raise-beacon"]);
  assert.ok(registry.objectives[0]?.gate?.maxHealth);
  assert.match(serializeGameplayRegistry(registry), /"terminalLootTable"/);
});
