# Octree Level-Data Loader Reference

The complete supplied brief is preserved in
[`octree-level-data-loader-source.txt`](./octree-level-data-loader-source.txt).

## Implemented

- A bounded JSON footprint loader converts center-and-size records to AABBs and
  adds them to the server-owned `StaticWorldCollisionMap`.
- Input is limited to 1 MiB and 4,096 structures. Records require the documented
  fields, unique safe integer IDs, valid type slugs, finite coordinates, and
  positive dimensions.
- The collision map validates a full batch before insertion, so an invalid or
  over-capacity asset cannot leave a partially loaded map.
- `AuthoritativeMatch.loadLevelGeometryAsset()` accepts trusted map data before
  players register and rejects late loads.
- Server yaw and pitch are now rate-limited from server-measured elapsed time.
  Yaw uses shortest-path wraparound; pitch stays within ±89°. The versioned
  binary snapshot now carries the server-owned orientation.
- Vite emits dedicated Three.js and React vendor chunks. The normal chunk-size
  warning threshold and production console behavior remain unchanged.

## Deliberate limits

This does not add the suggested octree. The existing collision system is a
bounded, server-owned AABB map, and the project does not yet provide a canonical
server level asset or measurements showing the current broadphase is too slow.
The loader is ready for trusted JSON supplied by the match bootstrap; it does
not load client-provided geometry or invent placeholder world obstacles.

The generated browser world is not yet connected to this server collision map,
and the API server does not yet create networked match instances at startup.
Therefore, this work establishes the validated asset and orientation interfaces,
not a claim that production matches are already loading the full generated map.
