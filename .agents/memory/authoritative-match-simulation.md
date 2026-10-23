---
name: Authoritative match simulation
description: Safety boundaries for staged server-owned MTE multiplayer and zone simulation.
---

The user wants to use the authoritative multiplayer brief as a game direction. Treat its sample code as a sketch, not production code. Server-owned identity must come from an authenticated connection; input packets must not supply identity, position, speed, or client timestamps. Validate sequences and ranges, cap input queues/rates and tick deltas, and use explicit safe-zone phases.

Use nested coordinate maps rather than 16-bit packed grid keys, and apply exact radius checks after broadphase queries. Fixed-step timing should consume monotonic time, cap catch-up work, and report dropped time; do not use a recursive `setImmediate` loop or claim zero allocations without profiling. Reuse caller-provided spatial query buffers when practical, but profile before introducing pooling.

The current multiplayer core is transport-agnostic and not wired to the solo client. Do not imply that this provides live multiplayer, authoritative weapon hits, or a complete Battle Royale mode. Keep the existing solo mission usable while adding transport, prediction, raycasts, rewards, and extraction in tested stages.

**Why:** The attached proposals identify the right server-authority direction but their examples trust client identity/time, use unbounded or unsafe structures, and omit the transport and gameplay authority needed for production.

**How to apply:** Keep network/session ownership separate from the pure match simulator. Before exposing it, add authenticated transport, abuse controls, client reconciliation, authoritative combat, load profiling, and multi-client verification.
