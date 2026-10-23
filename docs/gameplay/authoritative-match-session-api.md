# Authoritative Match Session API

This is the first server-owned match-session path. It uses the existing
transport-neutral simulation and loads the generated Nod collision asset before
players can join.

## Routes

All routes are under `/api`:

- `POST /matches` — create a bounded, in-memory match session. The server loads
  the canonical map; clients cannot provide a map or match configuration.
- `POST /matches/:matchId/players` — join. The server creates the player ID
  and selects a clear spawn inside the initial zone.
- `POST /matches/:matchId/input` — submit a sequenced movement/look/hand input
  packet using `Authorization: Bearer <accessToken>`.
- `GET /matches/:matchId/snapshot` — read the latest authoritative snapshot
  using the same bearer token.
- `DELETE /matches/:matchId/player` — remove the authenticated player from the
  match and revoke that token.

The join response returns the opaque player access token once. Only its SHA-256
digest is retained in memory. Input bodies do not establish identity, spawn
coordinates, timestamps, speed, or position. Snapshot responses are
`Cache-Control: no-store`.

## Resource and lifecycle limits

- At most 12 active sessions, 64 players per session, and 3 session creations
  per client address per minute.
- Sessions expire after five minutes idle or 30 minutes maximum lifetime.
- The server runs bounded 60 Hz fixed-step simulation with capped catch-up;
  dropped simulation time is logged.
- Join and snapshot requests are rate-limited; individual input queues and
  input rates remain bounded by the existing match simulator.
- The JSON request body limit is 16 KiB.

Sessions and access tokens are in memory only; a process restart ends them.
This is a REST polling prototype, not a WebSocket transport, account system,
production matchmaking service, or persistence layer. The solo browser client
is not connected to these routes. The simulation currently validates movement,
look state, zone phase, and hand-action flags; it does not provide authoritative
weapon hit detection, inventory rewards, or extraction claims.
