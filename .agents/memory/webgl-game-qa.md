---
name: WebGL game QA
description: Verifying Mission To Earth when the screenshot preview browser cannot create a WebGL context.
---

For runtime testing, use a separate workspace Chromium session with WebGL enabled through SwiftShader when the screenshot preview browser cannot create a WebGL context. Treat that as a limitation of the capture browser, not proof that the game renderer is broken.

Measure frame rate before exercising timed gameplay. The game loop caps each frame's simulation delta at 0.05 seconds; at low software-rendered frame rates, mission movement and timers can fall behind wall time. SwiftShader is suitable for confirming that the 3D scene renders and for short interaction checks, but a slow run is not evidence of normal device movement or mission balance.

The SVG City of Nod fallback only preserves a visual backdrop for browsers without WebGL; it is not the playable scene and does not validate Three.js rendering or performance.

**Why:** On 2026-10-24, an 800×450 workspace Chromium run with SwiftShader fell to about 2.8 FPS in active play, making mission timers and movement lag far behind wall time. A later extraction attempt stalled at a collision obstruction and completed only after the game's native reinsert, so the win did not certify uninterrupted traversal.

**How to apply:** Use SwiftShader to confirm rendering and short control interactions, not timed mission balance or device performance. Record its frame rate; use a faster WebGL browser or real hardware for timed mission certification. During a full route test, record actual displacement and classify runs with death/reinsert separately from uninterrupted traversal. The static fallback validates menu composition only.
