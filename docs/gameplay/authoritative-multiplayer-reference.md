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

## Current MTE implementation — verified 2026-10-31

### Implemented and tested

- `artifacts/api-server/src/lib/authoritative-match.ts` validates input shape, movement, look angles, flags, sequence order, queue size, packet rate, stale held input, and bounded simulation deltas.
- `match-session-manager.ts` starts from the API-server entry point and owns bounded in-memory sessions. The 60 Hz fixed-step simulation, session capacity, expiry, and per-player limits are exercised by tests.
- `match-bootstrap.ts` loads and validates server-owned generated Nod geometry and gameplay data before players join. This is one hardcoded map bootstrap, not yet a reusable map catalog.
- Match REST routes create sessions, assign player IDs and spawn positions, accept authenticated input, and return snapshots and world-state. The React mission has a Server Loot Run path through `ServerMatchClient`.
- Server-side combat tests cover weapon cadence, hit validation, cover occlusion, and reload state. Loot and terminal actions validate server-owned positions and prevent duplicate claims.
- Extraction hold status is server-validated. Once ready, a durable receipt can be settled idempotently into the authenticated player's profile and inventory. A match session itself remains in memory and is not restored after process restart.
- `spatial-hash-grid.ts`, `fixed-step-accumulator.ts`, `authoritative-snapshot-codec.ts`, and `static-world-collision-map.ts` provide bounded, tested building blocks. The codec is not connected to the current REST client.

These are correctness-oriented foundations, not a claim of AAA performance. The static collision map has a 4,096-box cap and linear scans; spatial indexing covers bounded nearby-player queries, not every collision or raycast. The configured 64-player session ceiling is not evidence of a tested 64-player match.

### Integrated prototype and remaining gaps

The browser's Server Loot Run submits input every 50 ms (20 Hz), reads snapshots every 200 ms (5 Hz), and polls gameplay and extraction state every 1,500 ms. This is a REST-polling prototype, not the final low-latency transport. The current client does not implement explicit prediction/reconciliation or remote-player interpolation.

The server gameplay registry includes rescue, beacon, and extraction objective records, but the authoritative gameplay snapshot still labels objectives as waiting for a server event or locked. The current match routes do not advance the rescue/beacon objective chain, assign teams, run competitive rounds, or settle a round winner. Extraction hold and reward settlement do not prove that the campaign objective chain has completed.

The match bootstrap remains Nod-specific. There is no map catalog/version selection, Cinder Row arena, authenticated real-time socket transport, team/spawn/respawn lifecycle, reconnect recovery for a live match, multi-client latency/loss certification, or load/performance certification. Keep the solo campaign as the stable baseline and do not advertise production multiplayer.

## Integration order

1. Preserve and verify the solo rescue-to-extraction baseline; keep these implementation limits documented.
2. Define a versioned, server-approved map/match contract and map catalog before adding selectable maps.
3. Prototype one compact graybox arena, **Cinder Row: Blackout**, with three lanes and a server-owned relay objective. Target 4v4 only as a vertical-slice test, not a certified capacity claim.
4. Add server-owned teams, objective progress, round lifecycle, and result settlement for that slice.
5. Replace REST polling for live combat with a bounded real-time transport, then add prediction/reconciliation and remote interpolation.
6. Run multi-client, reconnect, latency/loss, security, and load tests before calling the arena production-ready.

The arena is intended to expose and complete these dependencies, not to imply they already work. See [`updated-repository-forensic-evaluation-2026-10-31.md`](./updated-repository-forensic-evaluation-2026-10-31.md) for the full current assessment and acceptance gates.
