# Match Security Hardening Reference

The supplied security proposal is preserved in full at
[`match-security-hardening-source.txt`](./match-security-hardening-source.txt).

## Applied to the current game

- The authoritative match-session API authenticates player actions with an
  opaque, per-player bearer token. Only its SHA-256 digest is retained in
  memory, and player IDs, spawn positions, and input receipt times are chosen
  by the server.
- Input parsing uses a strict field schema. Tests verify that extra identity
  fields are rejected; objective, loot, or reward claims are not accepted by
  the movement/input endpoint.
- The session layer bounds active sessions, player counts, request rates,
  input queues, snapshots, and session lifetime. It runs capped fixed-step
  simulation and logs dropped time.
- The level exporter uses the simulation's canonical world data, then validates
  the resulting geometry on server load. It does not infer collision from mesh
  names, which can include visual-only meshes and rotated objects.

## Deferred from the proposal

The proposed loot table still has invalid TypeScript entries. More importantly,
projecting loot onto every structure's roof does not prove a spawn is reachable
or outside collision, and the example's `Math.sin` selection is not a reliable
random distribution. The current API has no server-owned loot registry or
reward-claim flow, so adding those claims here would create a new trust boundary
without an authoritative game-economy model.

The proposed objective validator mutates a passed `serverObjective` object, so
it is not stateless. The server currently has no canonical objective/terminal
registry or mission event state. There is no objective interaction endpoint;
the input schema rejects arbitrary objective fields. Objective completion
should be added only alongside server-owned mission state, transactions, and
duplicate-completion protection.

This is staged session security, not a claim of production certification. The
bearer sessions are ephemeral, the match API is not connected to the solo
browser client, and weapon hit detection, loot rewards, objective completion,
and persistent accounts remain outside the current authoritative simulation.
