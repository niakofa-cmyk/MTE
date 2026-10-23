---
name: Nod graphics pipeline
description: Visual rendering choices and asset constraints for the Mission To Earth City of Nod scene.
---

Keep City of Nod on its existing bounded Three.js WebGL renderer. Favor restrained bloom, color grading, procedural haze, and lightweight GPU particles over an unbounded generated skyline or an engine replacement.

**Why:** The supplied graphics snippets include asset URLs that are not present in the project and a much larger city than the current navigable region. Using those paths would create failed requests, while enlarging the city would separate visuals from collision and mission geometry.

**How to apply:** Reuse the generated Nod scene and current renderer. Do not claim texture streaming until authored maps and a real manifest exist; add and profile those assets as a separate step. Verify shaders in WebGL-capable Chromium and treat SwiftShader results as compatibility checks, not hardware performance results.
