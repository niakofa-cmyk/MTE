---
name: Mobile touch QA
description: Reproduce Mission To Earth touch input accurately in a browser.
---

For browser-emulated mobile QA, enable mobile device metrics and touch emulation before reloading the page. Keep the same CDP WebSocket session connected from setup through reload, mission start, and all pointer checks; closing it reset `pointer: coarse` and `navigator.maxTouchPoints` in workspace Chromium, hiding the touch overlay. The game engine snapshots the coarse-pointer media query during construction. Use separate, unobstructed movement and look regions; fixed fire and weapon controls can intentionally intercept pointer starts. Verify actual player displacement plus yaw and pitch changes, not only controller unit outputs.

**Why:** A prior browser test reported zero touch coordinates and no movement. Controlled Chromium touch emulation delivered valid coordinates and simultaneous movement/look, while an exploratory gesture landed on the focus control; this pass also showed the CDP emulation resets when its WebSocket session closes.

**How to apply:** Record viewport, coarse-pointer state, active pointer coordinates/targets, movement, camera rotation, and firing results. Keep the CDP session alive until those checks finish. Keep physical-device certification separate from browser emulation.
