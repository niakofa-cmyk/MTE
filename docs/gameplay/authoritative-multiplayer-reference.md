# Authoritative Multiplayer Architecture Reference

This project reference captures the attached design brief, `Pasted-To-transition-this-project-from-isolated-sample-logic-i_1792770753052.txt`, and the implementation boundary chosen for Mission To Earth.

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

Do not copy those behaviors into a live service. A transport must authenticate a connection and map it to a server-owned player ID before passing input to the simulation. Keep credentials and identity out of input payloads.

## Implemented foundation

`artifacts/api-server/src/lib/authoritative-match.ts` contains a pure, transport-agnostic match core. It validates packet shape, angles, movement, flags, and sequence order; limits queue size and packet rate; expires stale held input; derives movement from server configuration; and runs explicit safe-zone phases with capped delta time. Tests live in `artifacts/api-server/test/authoritative-match.test.mjs`.

This core is not yet exposed to clients. The current game remains a local single-player mission. There is no authenticated multiplayer transport, matchmaking, client prediction/reconciliation, authoritative weapon raycasting, loot/inventory replication, or production Battle Royale mode. Do not describe the game as network-authoritative until those parts are implemented and verified together.

## Integration order

1. Add authenticated room/session ownership and a bounded transport.
2. Define the network contract and acknowledgement/snapshot cadence; integrate client prediction and reconciliation.
3. Add server-owned weapon inventory, fire cadence, collision/raycast hit registration, and damage.
4. Add server-owned loot claims, extraction outcomes, and duplicate-claim protection.
5. Run load, abuse, reconnect, and multi-client tests before enabling public matches.

The existing local mission and its controls remain the gameplay baseline while these layers are built in testable stages.
