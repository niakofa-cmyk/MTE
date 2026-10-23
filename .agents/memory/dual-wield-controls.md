---
name: Dual-wield control contract
description: User-selected controls and reload behavior for Mission To Earth's dual-wield gameplay.
---

Use separate hand states and inputs: desktop left mouse fires the right-hand weapon, right mouse fires the left-hand weapon, and focus replaces traditional ADS. Middle mouse holds focus and V toggles it. Focus modestly tightens FOV, spread, and look sensitivity.

R reloads only the hand that needs ammunition; when both hands need it, reload right then left. Double-tap R reloads both at once with a duration penalty. On mobile, the left thumb moves, the right area controls both yaw and pitch, the second fire trigger appears when the off-hand is equipped, and a nearby focus button toggles focus. Gamepad left stick moves, right stick looks on both axes, the triggers fire separate hands, and right-stick click toggles focus.

**Why:** The user chose deliberate, independent dual-wield actions and full right-thumb camera control rather than keeping ADS on right-click.

**How to apply:** Preserve these mappings when changing player input or weapon systems. Add network replication only when an authoritative multiplayer mode exists; do not send sample input packets as if this local mission were multiplayer.
