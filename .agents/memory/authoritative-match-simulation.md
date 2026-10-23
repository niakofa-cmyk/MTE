---
name: Authoritative match simulation
description: Safety boundaries for staged server-owned MTE multiplayer and zone simulation.
---

The user wants to use the authoritative multiplayer brief as a game direction. Treat its sample code as a sketch, not production code. Server-owned identity must come from an authenticated connection; input packets must not supply identity, position, speed, or client timestamps. Validate sequences and ranges, cap input queues/rates and tick deltas, and use explicit safe-zone phases.

Use nested coordinate maps rather than 16-bit packed grid keys, and apply exact radius checks after broadphase queries. Fixed-step timing should consume monotonic time, cap catch-up work, and report dropped time; do not use a recursive `setImmediate` loop or claim zero allocations without profiling. Reuse caller-provided spatial query buffers when practical, but profile before introducing pooling.

Binary snapshots need a versioned, bounded wire format with explicit numeric ranges, complete IDs, malformed-packet rejection, and buffer ownership safe for asynchronous sends. Keep codecs separate from transport; do not reuse a shared mutable buffer across sends. If sequence fields are narrowed to 32-bit values, define session reset/wrap behavior before network integration.

Static collision geometry must be copied, validated, bounded, and loaded before players join. Ray/AABB checks must handle zero direction components; movement must use swept checks rather than only testing the final point. Do not claim octree performance for a bounded linear scan.

The transport-neutral simulation now has a bounded HTTP match-session wrapper with short-lived bearer player tokens and an optional Server Loot Run client. The client stores its temporary session in `sessionStorage`, streams movement over REST, periodically reconciles server position, and applies loot effects only after the server grant. It is a REST polling prototype, not production multiplayer; the solo mission's combat and extraction progression remain client-side.

Loot spawn and objective registries are generated from the same deterministic Nod world data and validated before match creation. Loot claims and terminal openings must use the authenticated player's server-simulated position, server-owned item tables, and one-time session state. Rescue/beacon/extraction completion stays blocked until authoritative gate damage and mission progression exist; the current item ledger is match-session-only, not durable inventory.

**Why:** The attached proposals identify the right server-authority direction but their examples trust client identity/time, use unbounded or unsafe structures, and omit the transport and gameplay authority needed for production. The optional client proves server-owned loot claims without turning local solo progression into an account economy.

**How to apply:** Keep network/session ownership separate from the pure match simulator. The HTTP wrapper uses ephemeral bearer identity and bounded in-memory sessions; preserve those limits and do not treat them as persistent accounts. Keep server claims independent of local extraction rewards. Before broad online use, add durable identity only if required, deployment abuse controls, authoritative combat/objectives, load profiling, and multi-client verification.

The server now also has standalone weapon-stat validation and ability-timer primitives. They are not yet connected to match registration, input processing, or hit resolution; do not treat them as live combat authority.

**Why:** The current REST match owns movement and loot, but it has no server-owned loadout catalog, player ability selection, or combat target resolver.

**How to apply:** Wire these primitives only after those server-owned inputs and effects exist. Keep client-supplied stat values out of loadout and ability requests.
