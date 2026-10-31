---
name: Authoritative match simulation
description: Safety boundaries for staged server-owned MTE multiplayer and zone simulation.
---

The user wants to use the authoritative multiplayer brief as a game direction. Treat its sample code as a sketch, not production code. Server-owned identity must come from an authenticated connection; input packets must not supply identity, position, speed, or client timestamps. Validate sequences and ranges, cap input queues/rates and tick deltas, and use explicit safe-zone phases.

Use nested coordinate maps rather than 16-bit packed grid keys, and apply exact radius checks after broadphase queries. Fixed-step timing should consume monotonic time, cap catch-up work, and report dropped time; do not use a recursive `setImmediate` loop or claim zero allocations without profiling. Reuse caller-provided spatial query buffers when practical, but profile before introducing pooling.

Binary snapshots need a versioned, bounded wire format with explicit numeric ranges, complete IDs, malformed-packet rejection, and buffer ownership safe for asynchronous sends. Keep codecs separate from transport; do not reuse a shared mutable buffer across sends. If sequence fields are narrowed to 32-bit values, define session reset/wrap behavior before network integration.

Static collision geometry must be copied, validated, bounded, and loaded before players join. Ray/AABB checks must handle zero direction components; movement must use swept checks rather than only testing the final point. Do not claim octree performance for a bounded linear scan.

The transport-neutral simulation now has a bounded HTTP match-session wrapper for Nod loot runs and Cinder Row relay-control. Clients store temporary match sessions in `sessionStorage`, stream input and reconcile snapshots over REST, and apply server-granted loot only. Cinder Row's relay timer and team assignment are server-owned. This remains a REST polling prototype, not production multiplayer; Nod rescue and beacon progression remain client-side, while server extraction hold and reward settlement are a separate validated path.

Loot spawn and objective registries are generated from the same deterministic Nod world data and validated before match creation. Loot claims and terminal openings use the authenticated player's server-simulated position, server-owned item tables, and one-time session state. Cinder Row relay control is a separate server-owned objective and does not make descendant rescue or beacon progression authoritative. Validated extraction settlements can persist to the authenticated profile; ordinary match loot remains session-scoped.

**Why:** The attached proposals identify the right server-authority direction but their examples trust client identity/time, use unbounded or unsafe structures, and omit the transport and gameplay authority needed for production. The optional client proves server-owned loot claims without turning local solo progression into an account economy.

**How to apply:** Keep network/session ownership separate from the pure match simulator. The HTTP wrapper uses ephemeral bearer identity and bounded in-memory sessions; do not treat match sessions as persistent accounts. Keep account-validated extraction settlement separate from ordinary match loot. Before broad online use, add deployment abuse controls, stronger transport, load profiling, reconnect/respawn rules, and multi-client verification.

REST match sessions now assign allowlisted operators and server-owned base weapons. The server owns per-hand ammo, fire cadence, reloads, player hit resolution, operator ability cooldowns/effects, and version-3 weapon/ability snapshots. Attachment modifiers are not applied to match loadouts.

**Why:** Multiplayer stats and rewards must not be chosen by clients, while the current session remains an ephemeral prototype rather than a production identity or economy.

**How to apply:** Keep damage inputs server-derived from validated fire flags, server-owned transforms, trusted weapon profiles, and static collision. Keep Cinder Row relay authority distinct from Nod NPC combat and rescue/beacon progression. Do not claim the REST polling prototype is production netcode or that it certifies competitive play at scale.
