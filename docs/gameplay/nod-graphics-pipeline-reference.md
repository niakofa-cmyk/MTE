# City of Nod graphics pipeline reference

This reference adapts the attached graphics proposals:

- `Pasted--1-Screen-Space-Post-Processing-Pipeline-Bloom-Chromati_1792785976539.txt`
- `Pasted-To-elevate-the-City-of-Nod-s-web-visual-experience-into_1792786009674.txt`

## Runtime target

Mission To Earth is an existing Three.js browser game, not a backend-only tool.
Keep the bounded, generated City of Nod scene and its collision geometry as the
source of truth. Do not replace the renderer with Unreal Engine or add an
unbounded city-generation pass.

## Implemented visual direction

- Render the world and first-person weapon scene through a shared
  `EffectComposer`, then apply restrained emissive bloom, edge-weighted
  chromatic aberration, vignette, and Three.js output color/tone mapping.
- Preserve a separate depth clear between the world and first-person view model
  so weapons remain in front of the scene while still receiving post effects.
- Add slowly shifting procedural horizon haze to the existing Nod sky shader,
  and a small GPU-driven ash field for ambient depth. Keep both effects subtle
  and reduce particle count, pixel ratio, bloom, and color fringe on touch
  devices.
- Keep the existing ground canvas texture, emissive signage, city fog, rain,
  sparks, and generated geometry; these are the available visual sources.

## Asset-streaming limits

The attached examples refer to `/assets/textures/nod_city_*` and
`/assets/textures/cyber_prison_*`, but this project has no authored building
diffuse, normal, or emissive texture set at those paths. Do not enqueue those
requests or claim that texture streaming is active. Add a prioritized,
cancellable texture loader only after real texture assets and their manifest
are added; keep decode and GPU upload cost bounded and provide a material
fallback.

The ash points are a low-cost atmospheric particle effect, not true volumetric
smoke. Thermite smoke, high-resolution streamed materials, and asset-specific
lighting require actual authored assets and separate performance checks.

## Validation

Use WebGL-capable Chromium with SwiftShader to check renderer startup and
post-processing when the screenshot capture browser cannot create WebGL.
Software rendering confirms shader and pass compatibility, not hardware
performance. Recheck desktop and mobile GPU frame times before increasing
resolution, bloom radius, or particle density.
