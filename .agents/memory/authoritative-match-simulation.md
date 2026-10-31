---
name: Authoritative match simulation
description: Safety boundaries for staged server-owned MTE multiplayer and zone simulation.
---

The user wants to use the authoritative multiplayer brief as a game direction. Treat its sample code as a sketch, not production code. Server-owned identity must come from an authenticated connection; input packets must not supply identity, position, speed, or client timestamps. Validate sequences and ranges, cap input queues/rates and tick deltas, and use explicit safe-zone phases.

Use nested coordinate maps rather than 16-bit packed grid keys, and apply exact radius checks after broadphase queries. Fixed-step timing should consume monotonic time, cap catch-up work, and report dropped time; do not use a recursive `setImmediate` loop or claim zero allocations without profiling. Reuse caller-provided spatial query buffers when practical, but profile before introducing pooling.

Binary snapshots need a versioned, bounded wire format with explicit numeric ranges, complete IDs, malformed-packet rejection, and buffer ownership safe for asynchronous sends. Keep codecs separate from transport; do not reuse a shared mutable buffer across sends. If sequence fields are narrowed to 32-bit values, define session reset/wrap behavior before network integration.

Static collision geometry must be copied, validated, bounded, and loaded before players join. Ray/AABB checks must handle zero direction components; movement must use swept checks rather than only testing the final point. Do not claim octree performance for a bounded linear scan.

The transport-neutral simulation now has authenticated private Cinder Row rooms, a WebSocket snapshot/input path, and an eight-player ranked queue with database-backed Elo results. Account identity is verified at the WebSocket handshake and again against the match token; Cinder relay scoring excludes disconnected real-time players. Nod server runs retain REST snapshots and their separate validated extraction-reward flow.

Loot spawn and objective registries are generated from the same deterministic Nod world data and validated before match creation. Loot claims and terminal openings use the authenticated player's server-simulated position, server-owned item tables, and one-time session state. Cinder Row relay control is a separate server-owned objective and does not make descendant rescue or beacon progression authoritative. Validated extraction settlements can persist to the authenticated profile; ordinary match loot remains session-scoped.

**Why:** The attached proposals identify the right server-authority direction but their examples trust client identity/time, use unbounded or unsafe structures, and omit the transport and gameplay authority needed for production. The optional client proves server-owned loot claims without turning local solo progression into an account economy.

**How to apply:** Keep network/session ownership separate from the pure match simulator. Match rooms, ranked queue entries, and live tickets remain process-local; do not deploy multiple API instances without a shared single-owner simulation/routing design. Keep account-validated extraction settlement separate from ordinary match loot. Before broad online use, test process-failure recovery, load, network latency, and reconnect rules.

REST match sessions now assign allowlisted operators and server-owned base weapons. The server owns per-hand ammo, fire cadence, reloads, player hit resolution, operator ability cooldowns/effects, and version-3 weapon/ability snapshots. Attachment modifiers are not applied to match loadouts.

**Why:** Multiplayer stats and rewards must not be chosen by clients, while the current session remains an ephemeral prototype rather than a production identity or economy.

**How to apply:** Keep damage inputs server-derived from validated fire flags, server-owned transforms, trusted weapon profiles, and static collision. Keep Cinder Row relay authority distinct from Nod NPC combat and rescue/beacon progression. The bounded WebSocket path is a single-process competitive foundation, not production certification; verify multi-instance ownership, abuse controls, and scale before launch.
