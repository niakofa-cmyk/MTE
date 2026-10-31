import { buildWorld } from "./world.ts";
import { buildCinderRowWorld } from "./world.ts";
import { exportStaticWorldGeometry } from "./level-geometry-export.ts";
import { persistWorldGeometry } from "./level-geometry-worker.ts";
import { exportGameplayRegistry } from "./gameplay-registry-export.ts";
import { persistGameplayRegistry } from "./gameplay-registry-worker.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gameDir = dirname(fileURLToPath(import.meta.url));
const generatedDir = resolve(gameDir, "../../../api-server/src/data/generated");
const world = buildWorld();
const [geometryResult, gameplayResult] = await Promise.all([
  persistWorldGeometry(exportStaticWorldGeometry(world)),
  persistGameplayRegistry(exportGameplayRegistry(world)),
]);
console.info(
  `Exported ${geometryResult.nodeCount} static Nod geometry nodes (${geometryResult.byteLength} bytes) to ${geometryResult.path}`,
);
console.info(
  `Exported ${gameplayResult.lootSpawnCount} loot spawns, ${gameplayResult.terminalCount} terminals, and ${gameplayResult.objectiveCount} objectives (${gameplayResult.byteLength} bytes) to ${gameplayResult.path}`,
);

const cinderRow = buildCinderRowWorld();
const [arenaGeometry, arenaRegistry] = await Promise.all([
  persistWorldGeometry(
    exportStaticWorldGeometry(cinderRow),
    resolve(generatedDir, "cinder-row-blackout-level-geometry.json"),
  ),
  persistGameplayRegistry(
    {
      schemaVersion: 1,
      lootSpawns: [],
      terminals: [],
      objectives: [],
      terminalLootTable: [],
    },
    resolve(generatedDir, "cinder-row-blackout-gameplay-registry.json"),
  ),
]);
console.info(
  `Exported ${arenaGeometry.nodeCount} static Cinder Row geometry nodes (${arenaGeometry.byteLength} bytes) to ${arenaGeometry.path}`,
);
console.info(
  `Exported Cinder Row gameplay registry (${arenaRegistry.byteLength} bytes) to ${arenaRegistry.path}`,
);
