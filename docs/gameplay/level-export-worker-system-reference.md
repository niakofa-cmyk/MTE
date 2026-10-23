# Canonical World Geometry Export and Worker

The supplied briefs are preserved in full:

- [`canonical-world-map-export-source.txt`](./canonical-world-map-export-source.txt)
- [`level-export-worker-system-source.txt`](./level-export-worker-system-source.txt)

## Implemented pipeline

- Exporter reads the game's existing `WorldData.buildings` and `WorldData.covers`
  collision boxes. It does not crawl the rendered Three.js scene: the generator
  does not tag static meshes with `userData.isStaticObstacle`, and the simulation
  arrays are the current source of collision truth.
- Exported AABBs use world coordinates, deterministic IDs, center-and-size
  footprints, and the server loader's validated JSON schema.
- Destructible cover is excluded from the static export. The server does not yet
  simulate matching destruction, so registering these objects as permanent
  static blockers would diverge after they break.
- The asynchronous file worker writes to a unique temporary file and atomically
  renames it to
  `artifacts/api-server/src/data/generated/nod-level-geometry.json`.
- `pnpm export:level` runs the worker. API prebuild/pretest and the game Vite
  build run it automatically; the Vite dev server also watches the world and
  region layout source files and refreshes the export after edits.
- The API build copies the generated asset into `dist/data/generated`. The
  server match bootstrap reads and validates this trusted file before a player
  can be registered.

## Intentionally not copied from the samples

The sample scene exporter multiplies local dimensions by scale but ignores
rotated world bounds, and relies on obstacle metadata that is not present in the
current scene. Exporting `WorldData` avoids both issues.

The proposed loot spawner has invalid TypeScript table entries and uses
`Math.random()` without match seeding. The proposed objective shield mutates
client-supplied event state and does not validate authoritative mission state.
Neither is included in the geometry exporter; loot and objectives need their
own server-owned state and tests.

The map is loaded into the existing bounded AABB collision map, not an octree.
The API remains transport-agnostic and does not yet expose live multiplayer
matches; this pipeline makes the authoritative match factory ready with the
canonical geometry but does not claim a running networked game.
