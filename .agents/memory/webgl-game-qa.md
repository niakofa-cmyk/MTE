---
name: WebGL game QA
description: Verifying Mission To Earth when the screenshot preview browser cannot create a WebGL context.
---

For runtime testing, use a separate workspace Chromium session with WebGL enabled through SwiftShader when the screenshot preview browser cannot create a WebGL context. Treat that as a limitation of the capture browser, not proof that the game renderer is broken.

**Why:** The screenshot browser could not create a WebGL context, while workspace Chromium successfully created WebGL 2 and completed the mission loop.

**How to apply:** Verify 3D rendering and mission behavior in the WebGL-capable browser, and describe that result as software-rendered. Hardware-specific performance still needs a separate check.
