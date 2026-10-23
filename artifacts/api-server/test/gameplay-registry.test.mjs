import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadGameplayRegistryAsset } from "../src/lib/gameplay-registry.ts";
import { AuthoritativeGameplayState } from "../src/lib/authoritative-gameplay-state.ts";

const generatedGameplayPath = fileURLToPath(
  new URL("../src/data/generated/nod-gameplay-registry.json", import.meta.url),
);

test("generated gameplay registry validates and includes canonical mission records", async () => {
  const json = await readFile(generatedGameplayPath, "utf8");
  const registry = loadGameplayRegistryAsset(json);

  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.lootSpawns.length, 87);
  assert.equal(registry.terminals.length, 4);
  assert.deepEqual(
    registry.objectives.map((objective) => objective.id),
    ["rescue-alpha", "rescue-omega", "raise-beacon", "extract"],
  );
  assert.throws(
    () => loadGameplayRegistryAsset(json.replace('"schemaVersion": 1', '"schemaVersion": 2')),
    /unsupported schema version/,
  );
});

test("server gameplay state requires proximity and prevents duplicate loot claims", async () => {
  const registry = loadGameplayRegistryAsset(
    await readFile(generatedGameplayPath, "utf8"),
  );
  const state = new AuthoritativeGameplayState(registry);
  const target = registry.lootSpawns[0];
  assert.ok(target);

  assert.throws(
    () => state.claimLoot("player-a", target.id, { x: target.x + 10, z: target.z }),
    (error) => error?.code === "loot-out-of-range",
  );

  const result = state.claimLoot("player-a", target.id, { x: target.x, z: target.z });
  assert.equal(result.item.lootId, target.id);
  assert.equal(result.inventory.length, 1);
  assert.throws(
    () => state.claimLoot("player-b", target.id, { x: target.x, z: target.z }),
    (error) => error?.code === "loot-already-claimed",
  );
  assert.equal(
    state.getSnapshot("player-a").lootSpawns.find((spawn) => spawn.id === target.id)
      ?.available,
    false,
  );
  assert.equal(state.getSnapshot("player-b").inventory.length, 0);
});

test("server terminals generate weighted loot only after an in-range, one-time opening", async () => {
  const registry = loadGameplayRegistryAsset(
    await readFile(generatedGameplayPath, "utf8"),
  );
  const state = new AuthoritativeGameplayState(registry);
  const terminal = registry.terminals[0];
  assert.ok(terminal);

  assert.throws(
    () =>
      state.openTerminal(terminal.id, {
        x: terminal.x + terminal.interactionRadius + 1,
        z: terminal.z,
      }),
    (error) => error?.code === "terminal-out-of-range",
  );
  const result = state.openTerminal(terminal.id, { x: terminal.x, z: terminal.z });
  assert.equal(result.lootIds.length, 4);
  assert.equal(new Set(result.lootIds).size, 4);
  const snapshot = state.getSnapshot("player-a");
  assert.equal(snapshot.terminals.find((entry) => entry.id === terminal.id)?.state, "opened");
  assert.equal(snapshot.lootSpawns.length, registry.lootSpawns.length + 4);
  assert.throws(
    () => state.openTerminal(terminal.id, { x: terminal.x, z: terminal.z }),
    (error) => error?.code === "terminal-already-open",
  );
});

test("gameplay registry rejects forged objective dependencies and grant values", async () => {
  const source = JSON.parse(await readFile(generatedGameplayPath, "utf8"));
  source.objectives[2].prerequisites = ["client-picked-objective"];
  assert.throws(
    () => loadGameplayRegistryAsset(JSON.stringify(source)),
    /unknown prerequisite/,
  );

  const badLoot = JSON.parse(await readFile(generatedGameplayPath, "utf8"));
  badLoot.lootSpawns[0].scrap = 1_000_000;
  assert.throws(
    () => loadGameplayRegistryAsset(JSON.stringify(badLoot)),
    /invalid loot spawn/,
  );
});
