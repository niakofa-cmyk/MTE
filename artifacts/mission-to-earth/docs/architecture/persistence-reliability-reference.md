# Persistence Reliability Reference

## Source proposal

Adapted from `attached_assets/Pasted-The-persistence-layer-requires-a-structural-correction-_1792810894136.txt`. The proposal describes an authoritative server-side write-ahead log (WAL), replay on server startup, and tests for interrupted saves.

## Current Mission To Earth boundary

The playable prototype stores service records and extracted rewards in browser `localStorage`. The API server currently owns match simulation, not authenticated player profiles or inventories. Therefore, a filesystem WAL under `process.cwd()` would create a second, unowned profile store; it would not synchronize devices, authenticate rewards, or protect local progression from tampering.

The uploaded Node.js example is not copied directly. It does not validate or constrain `playerId` before using it in a filename, has no transaction identifier or duplicate-claim constraint, does not verify/replay payload schema before committing, and its sample test contains an incomplete `extractedWeaponIds` initializer. Its rename sequence is not a transaction across the staged log and profile file, and it does not establish a durable `fsync` boundary.

## Prototype implementation

Extraction persistence remains local and browser-owned. The service-record and reward snapshots are staged together under a versioned local journal key before either save is changed. The app verifies the staged payload, writes and reads back both existing versioned saves, then removes the journal. On startup, it replays any valid pending snapshot before loading progression into the UI. Replay applies absolute snapshots, so replaying the same staged transaction does not increment rewards again. Invalid or unwritable pending state is retained and surfaced through the existing save warning rather than silently discarded.

This is a best-effort browser-local recovery mechanism, not a server WAL or a transactional database. It does not protect against browser-data deletion, malicious local edits, multiple-device divergence, untrusted client reward claims, or concurrent tabs racing on the same save keys.

## When server authority is introduced

If the game adds account-linked profiles or valuable shared rewards, move extraction claims into an authenticated server transaction. Derive player identity from the authenticated session, validate the match result server-side, use a unique transaction ID with a database uniqueness constraint, and commit inventory plus service-record changes in one durable database transaction. A client assertion that extraction succeeded must not grant rewards. Use a filesystem WAL only if the selected server storage architecture requires one and its recovery, durability, replay, and path-safety properties are explicitly tested.
