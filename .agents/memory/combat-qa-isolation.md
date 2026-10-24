---
name: Combat QA isolation
description: Isolate live weapon-hit checks from allied NPC damage and restore gameplay state afterward.
---

When a live combat check uses a stationary enemy, pause non-target NPC behavior while the fixture is active. Squad allies may otherwise damage or defeat the test enemy, making it unclear whether player ammunition caused the health change.

**Why:** A live mission test initially produced a defeated guard without a player-attributed kill; allied NPC fire was the competing explanation. Freezing non-target actors made the player-shot result reproducible.

**How to apply:** For development-only engine integration tests, capture target health, ammunition, kills, and player state; isolate the target from other AI; invoke the normal weapon path; then restore the saved state even when the test fails.
