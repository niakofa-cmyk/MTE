---
name: Mobile touch QA
description: Reproduce Mission To Earth touch input accurately in a browser.
---

For browser-emulated mobile QA, enable mobile device metrics and touch emulation before reloading the page. The game engine snapshots the coarse-pointer media query during construction. Use separate, unobstructed movement and look regions; fixed fire and weapon controls can intentionally intercept pointer starts. Verify actual player displacement plus yaw and pitch changes, not only controller unit outputs.

**Why:** A prior browser test reported zero touch coordinates and no movement; controlled Chromium touch emulation delivered valid coordinates and simultaneous movement/look, while an exploratory gesture had landed on fixed action buttons.

**How to apply:** Record viewport, coarse-pointer state, active pointer coordinates/targets, movement, camera rotation, and firing results. Keep physical-device certification separate from browser emulation.
