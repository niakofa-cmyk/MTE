import { buildWorld } from "./world.ts";
import { exportStaticWorldGeometry } from "./level-geometry-export.ts";
import { persistWorldGeometry } from "./level-geometry-worker.ts";

const result = await persistWorldGeometry(
  exportStaticWorldGeometry(buildWorld()),
);
console.info(
  `Exported ${result.nodeCount} static Nod geometry nodes (${result.byteLength} bytes) to ${result.path}`,
);
