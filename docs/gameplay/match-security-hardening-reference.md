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
- A separate gameplay manifest is exported from the same generated Nod world:
  current placed loot, terminal coordinates and loot definitions, rescue gates,
  beacon, extraction, prerequisites, and hold durations. The server validates
  the manifest before creating a match; loot is not projected onto building
  roofs.
- Authenticated match routes expose that manifest's session state and let a
  player open a terminal or claim a loot ID. The server uses the player's
  simulated position, enforces proximity, generates terminal drops from the
  trusted table, and prevents a terminal or loot spawn from being used twice.
  Claimed items are kept in the short-lived match session only.

## Still deferred

The source proposal's sample loot table is syntactically invalid and its
`Math.sin` selection is not a reliable random distribution. The implementation
uses the existing game's loot points and item definitions instead. Terminal
loot uses server randomness and the current initial-mission rarity gates; it
does not yet track the client mission's uprising, stress, or zone-progress
modifiers.

The source objective validator mutates a passed object and accepts a geometric
node supplied by the caller. The server now owns objective records, but does
not yet complete rescues, beacon holds, or extraction: authoritative door
damage and mission progression are not part of the match simulator. Rescue
records therefore remain blocked on a server gate-destruction event, and later
objectives remain locked by prerequisites. No client objective completion
fields are accepted.

This is staged session security, not a claim of production certification. The
bearer sessions are ephemeral, the match API is not connected to the solo
browser client, and weapon hit detection, durable inventory, objective
completion, and persistent accounts remain outside the current authoritative
simulation.
