# Mission To Earth multiplayer scaling roadmap

## Product direction

Treat the user-provided milestones as staged capacity targets, not claims about current support:

| Phase | Intended match scale | Status |
| --- | ---: | --- |
| 1 | 8 players, competitive 4v4 | Current Cinder Row profile; local eight-client integration check added |
| 2 | 16 players, 8v8 | Not implemented or load-tested |
| 3 | 40 players, 20v20 | Not implemented; needs a larger team-battle map and visibility/network budget |
| 4 | 100-player planetary battlefield | Not implemented; needs a separate battle-royale world, interest management, and zone/loot systems |
| Long term | 100–150 players | Exploratory only; depends on dedicated-server capacity and measured cost/performance |

Arena warfare and planetary warfare are separate modes. Do not increase a global player limit and treat that as delivery of a larger mode. Each phase needs mode-specific maps, spawn layouts, objective rules, visibility/bandwidth budgets, server profiling, and failure/reconnect tests.

## Phase 1 verification boundary

The currently active Cinder Row profile is eight players total, four per team. The authoritative match library has a separate general capacity setting, but Cinder Row's geometry and spawn layout limit the active ranked profile to 4v4.

The local synthetic integration test creates a ranked match through the HTTP queue and connects eight authenticated WebSocket clients to one live server. It checks the 4v4 assignment, initial full-room snapshots, accepted input, and continued snapshot delivery. The latest full run observed at least 25 snapshots per client over the sampling window and 6 ms p95 local snapshot-delivery timing. A separate database test recreated the queue-store object, observed the same queued entries, verified a single active claim, and recovered the claim after its lease expired.

Those numbers measure a same-process, same-host test only. They do not measure internet latency, published compute, multi-process routing, a player-facing frame rate, or physical devices. They are not production certification.

## Production blockers

- The waiting queue is stored in PostgreSQL, and claimed queue batches expire so they can be recovered after a server interruption. Active match simulation, ranked tickets, and owner routing remain process-local. The current build must not be horizontally scaled without shared match ownership and explicit client routing.
- A process restart interrupts an active match. Match state does not yet resume from a durable checkpoint.
- No published eight-player match, network impairment test, soak test, regional latency test, or external player playtest has been run.
- Replit's deployment guidance recommends a Reserved VM for long-lived WebSocket connections. Deployment settings have not been changed and the app has not been published.
- Before Phase 2, establish distributed match ownership, reconnect/failover semantics, telemetry, and capacity thresholds; then validate those thresholds on the selected production compute.

## Next implementation phase

Complete and certify the single-region 4v4 arena lifecycle first: queue, all eight players connected, movement/combat/objective completion, rating settlement, reconnects, and clean abort/requeue behavior. Only then add an 8v8 mode with its own map/spawn profile and repeat the performance gate.
