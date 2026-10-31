# Authoritative Match Session API

**Status verified 2026-10-31:** the browser can start a server match through the
React `Server Loot Run` flow. The client uses bounded HTTP polling. This is an
integrated prototype, not a real-time competitive service.

## Routes

All routes are under `/api`:

- `POST /matches` — create a bounded in-memory match. The server loads the
  canonical Nod map; clients cannot supply geometry or match rules.
- `POST /matches/:matchId/players` — join. The server creates the player ID and
  selects a clear spawn. The response returns an opaque access token once.
- `POST /matches/:matchId/input` — submit sequenced movement, look, hand, and
  ability input using `Authorization: Bearer <accessToken>`.
- `GET /matches/:matchId/snapshot` — read the latest server-owned match snapshot.
- `GET /matches/:matchId/world-state` — read server-owned loot, terminals,
  objective records, and the player's temporary match inventory.
- `POST /matches/:matchId/loot/:lootId/claim` — claim a registered item after
  server-side range and availability checks.
- `POST /matches/:matchId/terminals/:terminalId/open` — open a registered
  terminal after server-side range and one-time-use checks.
- `GET /matches/:matchId/extraction/status` — read server-validated recovery
  hold status.
- `POST /matches/:matchId/extraction/settle` — settle a ready extraction for
  the authenticated account; retrying is idempotent.
- `DELETE /matches/:matchId/player` — remove the authenticated player and revoke
  the match token.
- `GET /auth/user` and `GET /profile` — read the Replit-authenticated account
  and its durable progression.

The join response's token is stored as a SHA-256 digest in memory. Input bodies
do not establish identity, spawn coordinates, timestamps, speed, or position.
The API's authentication middleware resolves account identity; reward values
come from server-owned match state, not client-submitted loot. Snapshot and
profile responses are not cacheable.

## Client cadence and server lifecycle

The current browser integration submits input every 50 ms, polls match snapshots
every 200 ms, and polls world-state and extraction status every 1,500 ms. This
means approximately 20 input updates per second and five snapshot requests per
second, with slower inventory/objective polling. The server processes simulation
on a bounded 60 Hz fixed-step loop.

- At most 12 active sessions and 64 players per session.
- At most 3 session creations per client address per minute.
- Sessions expire after five minutes idle or 30 minutes maximum lifetime.
- Input queues and packet rates are bounded; the JSON body limit is 16 KiB.

The match session, player token digests, and temporary inventory are in memory.
A process restart ends an unfinished match. After the server confirms extraction
readiness, it persists a durable receipt before settlement; a later retry can
settle that receipt after restart without granting the reward twice. This
recovery guarantee does not restore the live match simulation.

## Explicit limitations

- Transport is REST polling; there is no WebSocket or other persistent realtime
  transport.
- The client applies server snapshots but has no explicit input prediction and
  reconciliation or remote-player interpolation.
- The only match bootstrap is the server-owned Nod map. There is no map catalog,
  version selection, or Cinder Row arena.
- The server has validated combat, loot, terminal, and extraction primitives,
  but it does not yet advance the rescue/beacon objective chain, run teams and
  competitive rounds, or determine a relay-capture winner.
- The current 64-player configuration is not a measured capacity result.
- Automated tests cover units and API paths, not multi-client synchronization
  under real latency, packet loss, disconnects, or load.

See [`authoritative-multiplayer-reference.md`](./authoritative-multiplayer-reference.md)
for the implementation status and staged arena plan. Do not treat a successful
HTTP match flow or green CI run as multiplayer certification.
