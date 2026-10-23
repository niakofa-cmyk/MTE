# City of Nod renderer reference

The submitted renderer and spatial/touch proposal is preserved in [`city-of-nod-renderer-source.txt`](./city-of-nod-renderer-source.txt). This note describes what was used and why the snippets were not copied directly.

## Existing game path

Mission To Earth already uses Three.js for the playable scene, builds the City of Nod from the seeded region data, merges building geometry, renders lit windows and forest instances, and applies fog and a custom sky shader. The existing touch controller also tracks multiple pointer IDs and separates movement, look, fire, focus, and utility zones.

## Implemented fallback

When `MissionEngine` cannot create its WebGL renderer, the menu now shows a responsive, decorative SVG illustration of Nod: layered industrial towers, lit windows, a distant Accord signal, and a subdued perspective street grid. It appears beneath the existing menu and WebGL warning. It is a static visual fallback only; it does not make the mission playable without WebGL or replace the Three.js renderer.

## Problems in the supplied snippets

- The standalone WebGL page continues after `getContext("webgl2")` returns null, calls nonexistent `gl.uniformFloat`, and does not check shader compile or program link status. It creates a separate page rather than improving the running game, and cannot make a browser render WebGL when the browser has no WebGL context.
- The proposed octree inserts each box into every intersecting child and has no maximum depth. Bounds that repeatedly cross split planes can be duplicated through the tree and trigger unbounded subdivision; its claimed `O(log N)` behavior is not established.
- The touch sample stores one joystick anchor and omits per-pointer ownership. The existing in-game controller already handles simultaneous pointers and should not be replaced by this simpler sketch.

Keep visual testing honest: the SVG fallback can be checked in a browser without WebGL, but gameplay rendering and interaction still require a WebGL-capable browser. The fallback does not certify the 3D scene or performance.
