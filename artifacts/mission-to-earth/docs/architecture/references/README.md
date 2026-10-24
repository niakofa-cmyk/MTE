# Mission To Earth reference documents

The supplied project and design documents are preserved here:

- `mobile-react-native-touch-implementation.txt`
- `mobile-react-native-integrated-architecture.txt`
- `mobile-threejs-controls-demo.html`
- `post-rescue-campaign-transition.txt`
- `alpha-gate-breach-fix.txt`

These are reference material, not drop-in code or proof that a linked change was merged. Mission To Earth is a browser-based Three.js game, not a React Native/Expo application.

## Adaptation in this game

- Independent pointer IDs feed the existing touch-controller layer.
- Movement axes are sent to the game engine so world collision remains authoritative; UI code must not translate the camera/player mesh directly.
- The right-side look region updates both yaw and pitch while the left movement pointer stays active.
- Extraction continues to use the mission engine's existing prompt, hold-to-interact input, and reward flow. Do not add a separate per-frame bounding-box extraction loop that bypasses mission state.
- Touch sprint begins at 85% of the configured movement-stick radius and uses a bounded 2.2× multiplier; keyboard sprint keeps its existing 1.5× balance.
- The current game already renders a muzzle mesh, recoil, audio, fog, ACES tone mapping, bloom, and a reduced touch-device pixel ratio. The static demo's extra point lights and whole-screen flash are not copied into the mobile renderer without measured need.
- Operation Shakuna remains the opening rescue mission. Treat Sanctuary as a later unlockable hub/briefing, and do not build a new map or full hub before the existing rescue and extraction flow is certified.
- Alpha/Omega gates receive a modest shot-ray tolerance only when the forgiving gate hit remains ahead of other solid blockers. This does not change movement collision, gate health, or mission progression.
- Browser-emulated mobile checks are not physical-device certification.
