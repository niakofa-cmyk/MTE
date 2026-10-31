# Mission To Earth multiplayer scaling roadmap

## Product direction

Treat the user-provided milestones as staged capacity targets, not claims about current support:

| Phase | Intended match scale | Status |
| --- | ---: | --- |
| 1 | 8 players, competitive 4v4 | Implemented and locally integration-tested |
| 2 | 16 players, 8v8 | Full simulated relay round, 16-client WebSocket integration, and ranked settlement tested locally; not production load-tested |
| 3 | 40 players, 20v20 | Not implemented; needs a larger team-battle map and visibility/network budget |
| 4 | 100-player planetary battlefield | Not implemented; needs a separate battle-royale world, interest management, and zone/loot systems |
| Long term | 100–150 players | Exploratory only; depends on dedicated-server capacity and measured cost/performance |

Arena warfare and planetary warfare are separate modes. Do not increase a global player limit and treat that as delivery of a larger mode. Each phase needs mode-specific maps, spawn layouts, objective rules, visibility/bandwidth budgets, server profiling, and failure/reconnect tests.

## Phase 1 verification boundary

The default Cinder Row profile remains eight players total, four per team. A separately selectable 8v8 ranked profile now uses sixteen reserved spawn positions on the existing Cinder Row graybox. This is an expanded mode profile, not a new or production-certified map.

The local synthetic integration test creates a ranked match through the HTTP queue and connects eight authenticated WebSocket clients to one live server. It checks the 4v4 assignment, initial full-room snapshots, accepted input, and continued snapshot delivery. The latest full run observed at least 25 snapshots per client over the sampling window and 6 ms p95 local snapshot-delivery timing. A separate database test recreated the queue-store object, observed the same queued entries, verified a single active claim, and recovered the claim after its lease expired.

Those numbers measure a same-process, same-host test only. A gateway test also introduces client-side send delays, skips an input sequence, then reconnects with the same account ticket and continues with the next sequence. This is application-level fault simulation over localhost, not network-level packet shaping or WAN validation.

The Phase 2 local test authenticates sixteen ranked WebSocket clients, verifies eight assigned players per team and spawn separation, drives authoritative movement and a hit through WebSocket input, captures the relay, and persists all sixteen ranked results exactly once. The test advances a simulated server clock, so its full round is not a player-paced browser playthrough. It does not establish sustained match quality, internet latency, published compute capacity, multi-process routing, a player-facing frame rate, or physical-device behavior.

## Production blockers

- The waiting queue is stored in PostgreSQL, and claimed queue batches expire so they can be recovered after a server interruption. Active match simulation, ranked tickets, and owner routing remain process-local. The current build must not be horizontally scaled without shared match ownership and explicit client routing.
- A process restart marks active ranked sessions interrupted, awards no rating, and allows players to requeue. Live match state does not resume from a durable checkpoint.
- The 8v8 profile reuses Cinder Row's existing graybox; map flow, objective pressure, long-duration load, and balance still require playtesting.
- No WAN impairment test, published match, soak test, regional latency test, or external player playtest has been run.
- Replit's deployment guidance recommends a Reserved VM for long-lived WebSocket connections. Deployment settings have not been changed and the app has not been published.
- Before production competitive launch, establish distributed match ownership, reconnect/failover semantics, telemetry, and capacity thresholds; then validate those thresholds on the selected production compute.

## Next implementation phase

Run a player-paced browser playtest of the 8v8 mode, then profile both 4v4 and 8v8 under sustained local and WAN impairment, disconnect/reconnect, and restart scenarios. Add a dedicated larger arena layout only if Cinder Row's graybox fails measured gameplay or performance targets.
