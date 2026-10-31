---
name: Landscape-first mobile FPS
description: MTE's mobile presentation direction and the boundary between browser emulation and native-device support.
---

For MTE, landscape is the preferred active-combat layout; pre-deployment and command-center screens remain responsive. In browsers, recommend landscape and offer fullscreen, but do not force orientation. Preserve the full design brief at `artifacts/mission-to-earth/docs/reference/landscape-fps-mobile-warfare-source.txt`; its implementation status and unverified requirements are tracked beside it.

**Why:** The user requested a landscape-first, cinematic mobile FPS as a controlled evolution of the existing Three.js game, not a rewrite or a portrait-to-landscape rotation of the whole app.

**How to apply:** Keep campaign and competitive modes on the shared client only where their rules match. Validate orientation, safe areas, touch, performance, and device-specific features on real Android/iOS hardware before claiming certification.
