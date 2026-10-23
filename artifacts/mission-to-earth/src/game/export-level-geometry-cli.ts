import { buildWorld } from "./world.ts";
import { exportStaticWorldGeometry } from "./level-geometry-export.ts";
import { persistWorldGeometry } from "./level-geometry-worker.ts";
import { exportGameplayRegistry } from "./gameplay-registry-export.ts";
import { persistGameplayRegistry } from "./gameplay-registry-worker.ts";

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
