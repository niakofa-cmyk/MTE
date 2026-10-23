---
name: Authoritative match simulation
description: Safety boundaries for staged server-owned MTE multiplayer and zone simulation.
---

The user wants to use the authoritative multiplayer brief as a game direction. Treat its sample code as a sketch, not production code. Server-owned identity must come from an authenticated connection; input packets must not supply identity, position, speed, or client timestamps. Validate sequences and ranges, cap input queues/rates and tick deltas, and use explicit safe-zone phases.

The current multiplayer core is transport-agnostic and not wired to the solo client. Do not imply that this provides live multiplayer, authoritative weapon hits, or a complete Battle Royale mode. Keep the existing solo mission usable while adding transport, prediction, raycasts, rewards, and extraction in tested stages.

**Why:** The attached proposal identifies the right server-authority direction but its example trusts client identity/time, uses an unbounded queue, and omits the transport and gameplay authority needed for production.

**How to apply:** Keep network/session ownership separate from the pure match simulator. Before exposing it, add authenticated transport, abuse controls, client reconciliation, authoritative combat, and multi-client verification.
