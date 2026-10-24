---
name: Objective route guidance
description: Keep Mission To Earth player guidance aligned with collision and movement.
---

Player-facing objective bearings should not assume a straight line is traversable. Route guidance should use the same movement clearance rules as the player and show a safe detour when geometry blocks the direct bearing. Cache routes and advance by waypoints instead of running full pathfinding every frame.

**Why:** During a timed extraction, the straight compass bearing led into low cover even though a safe path existed around it; the player remained blocked while the zone continued collapsing.

**How to apply:** Reuse the player collision predicate for objective paths, update the compass/minimap together, and keep full path searches off the per-frame hot path.
