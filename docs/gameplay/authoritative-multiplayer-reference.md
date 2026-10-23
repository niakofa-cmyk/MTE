# Authoritative Multiplayer Architecture Reference

The original architecture brief and follow-up proposals are preserved in [`authoritative-multiplayer-source.txt`](./authoritative-multiplayer-source.txt), [`authoritative-scaling-source.txt`](./authoritative-scaling-source.txt), [`advanced-engine-additions-source.txt`](./advanced-engine-additions-source.txt), and [`security-collision-source.txt`](./security-collision-source.txt). This file records their implementation guidance and the safety boundary chosen for Mission To Earth.

## Core direction

- Clients send bounded input intent; the server owns player identity, position, velocity, health, match phase, and snapshots.
- Use independent left/right hand action flags, monotonically increasing sequence numbers, and server receipt time.
- Process inputs on a server tick; never use a client timestamp to order or authorize simulation.
- Keep Battle Royale zones in explicit phases: pre-drop, looting, collapse, extraction-ready, and match-over.
- Bound per-player input rate and queue size, validate numeric ranges, and cap simulation delta time.
- Keep snapshots serializable and detached from mutable server state.
- Add prediction/reconciliation only with a real client transport and explicit server acknowledgement semantics.

## Problems in the supplied sample

The sample is a design sketch, not production-ready networking code. It trusts packet-supplied player IDs and client timestamps, stores an unbounded global queue, accepts movement without robust range checks, advances the first zone collapse immediately, and does not implement authenticated transport, weapon authority, raycasts, or loot claims. Its `EventEmitter` does not itself provide WebSocket or UDP delivery.

The later scaling sample also has correctness and performance problems: its packed 16-bit cell coordinates can alias distant locations; its `getNearbyPlayers` returns whole buckets without exact radius filtering; and `setImmediate` recursively schedules work without waiting for the next tick, which can consume a CPU core. The excerpt is malformed around its input bitmask and cannot be copied as compiling engine code. “Zero allocation” is not established by a pre-sized array, and preallocation should follow profiling rather than be claimed as a guarantee.

The advanced additions sample is not production-ready either. It truncates player IDs to four UTF-16 code units, uses one static 64KB buffer without checking capacity, omits packet version and field validation, and still copies the buffer with `slice()`. Its mantle request can apply an upward impulse every held tick without ledge or collision validation. Its raycast checks one vertical cylinder at a time, has no maximum range or cover occlusion, and divides by the horizontal ray length for vertical shots.

The security follow-up also needs correction before use. Its slab ray test divides by each direction component without handling parallel axes, so axis-aligned rays can produce invalid intersections. The point-only movement fallback can tunnel through thin geometry. The sample’s weapon map returns mutable profiles despite claiming immutability, and its damage method accepts a target and hit result rather than proving that the server ray actually hit that target. The edge-trigger sample refers to slide/mantle bits that are not in the current input protocol.

Do not copy those behaviors into a live service. A transport must authenticate a connection and map it to a server-owned player ID before passing input to the simulation. Keep credentials and identity out of input payloads.

## Implemented foundation

`artifacts/api-server/src/lib/authoritative-match.ts` contains a pure, transport-agnostic match core. It validates packet shape, angles, movement, flags, and 32-bit sequence order; limits queue size and packet rate; expires stale held input; derives movement from server configuration; and runs explicit safe-zone phases with capped delta time. `spatial-hash-grid.ts` provides collision-safe nested cell maps, exact radius filtering, and reusable query output; the match core updates it on registration, movement, and disconnect. `fixed-step-accumulator.ts` converts monotonic nanosecond timestamps into bounded fixed steps and reports dropped time without running a busy loop. `authoritative-snapshot-codec.ts` encodes and decodes a versioned `MTE` binary snapshot with bounded UTF-8 IDs and 64KB maximum packet size, rejects malformed fields and packets, and returns owned buffers rather than reusing mutable global storage. `static-world-collision-map.ts` accepts copied, validated server-owned AABBs, rejects embedded spawns, resolves swept horizontal movement against walls, and provides bounded ray/AABB occlusion queries that handle parallel axes. Geometry must be loaded before players; the current implementation has a 4,096-box cap and linear scans. Tests live in `artifacts/api-server/test/`.

These structures are correctness-oriented foundations, not a claim of AAA performance. The static collision map is not populated from the game level yet, is not an octree, and has no performance certification. Spatial indexing is currently used for bounded nearby-player queries, not a complete collision or raycast engine. The accumulator is caller-driven; the API server does not start a live match loop until authenticated rooms and transport exist. No zero-allocation or thousands-of-entities throughput guarantee is made without profiling.

This core is not yet exposed to clients. The current game remains a local single-player mission. There is no authenticated multiplayer transport, matchmaking, client prediction/reconciliation, level collision import, authoritative weapon fire cadence/ammo/hit resolution, loot/inventory replication, or production Battle Royale mode. The binary codec is not connected to a socket, and the occlusion query is not yet connected to damage resolution. Do not describe the game as network-authoritative until those parts are implemented and verified together.

## Integration order

1. Add authenticated room/session ownership and a bounded transport.
2. Define the network contract and acknowledgement/snapshot cadence; integrate client prediction and reconciliation.
3. Add server-owned weapon inventory, fire cadence, collision/raycast hit registration, and damage.
4. Add server-owned loot claims, extraction outcomes, and duplicate-claim protection.
5. Run load, abuse, reconnect, and multi-client tests before enabling public matches.

The existing local mission and its controls remain the gameplay baseline while these layers are built in testable stages.
