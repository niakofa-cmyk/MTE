# Mobile input reference documents

The supplied React Native examples are preserved here:

- `mobile-react-native-touch-implementation.txt`
- `mobile-react-native-integrated-architecture.txt`
- `mobile-threejs-controls-demo.html`

They describe separate movement and look touch regions, two-axis camera aiming, held actions, responsive mobile presentation, sprint thresholds, visual fire feedback, and a simple extraction-zone demo. They are reference material, not drop-in code: Mission To Earth is a browser-based Three.js game, not a React Native/Expo application.

## Adaptation in this game

- Independent pointer IDs feed the existing touch-controller layer.
- Movement axes are sent to the game engine so world collision remains authoritative; UI code must not translate the camera/player mesh directly.
- The right-side look region updates both yaw and pitch while the left movement pointer stays active.
- Extraction continues to use the mission engine's existing prompt, hold-to-interact input, and reward flow. Do not add a separate per-frame bounding-box extraction loop that bypasses mission state.
- Touch sprint begins at 85% of the configured movement-stick radius and uses a bounded 2.2× multiplier; keyboard sprint keeps its existing 1.5× balance.
- The current game already renders a muzzle mesh, recoil, audio, fog, ACES tone mapping, bloom, and a reduced touch-device pixel ratio. The static demo's extra point lights and whole-screen flash are not copied into the mobile renderer without measured need.
- Browser-emulated mobile checks are not physical-device certification.
