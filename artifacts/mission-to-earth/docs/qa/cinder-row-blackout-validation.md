# Cinder Row: Blackout prototype validation

**Date:** 2026-10-31  
**Baseline commit:** `9feec5b84d4ce7a6a12f0bb97d401f9280d0fbcc`  
**Scope:** First server-authoritative relay-control slice in the existing Three.js game. This is not production multiplayer certification.

## Implemented

- Added Cinder Row as a selectable map without replacing the Nod rescue mission.
- Exported the Cinder Row collision geometry and gameplay registry from the game world into the API server build.
- Added an eight-player, two-team match mode. The server assigns teams and opposing spawn locations.
- Added a server-owned relay objective: the round waits for both teams, contests pause capture, and uncontested control can finish the round.
- Published map, team, and round state through the existing REST match snapshot.
- Added a dedicated Cinder Row menu and in-match status panel, plus team-color rendering for remote players.
- Kept Cinder Row loot-free and separate from Nod extraction rewards.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| API typecheck | PASS | `pnpm --filter @workspace/api-server run typecheck` |
| API automated tests | PASS | 59 tests, including relay capture and HTTP match creation with two server-assigned teams |
| Web typecheck | PASS | `pnpm --filter @workspace/mission-to-earth run typecheck` |
| Web automated tests | PASS | 168 tests |
| Web lint | PASS | `pnpm --filter @workspace/mission-to-earth run lint` |
| API production build | PASS | `pnpm --filter @workspace/api-server run build` |
| Web production build | PASS | Build passed with `PORT=3000 BASE_PATH=/mission-to-earth/` |
| Cinder Row browser rendering | PASS, software-rendered | Chromium with SwiftShader created WebGL contexts; Cinder Row panel/map selection rendered with no JavaScript exceptions after fixing an objective-marker assumption |
| Mobile-sized layout | PASS, emulated | 390×844 viewport; document width stayed 390px and the Cinder Row panel rendered |
| Authenticated live match from the UI | NOT TESTED | The browser session was unauthenticated; host/join correctly showed the sign-in requirement |
| Physical-device testing | NOT TESTED | No physical device was used |

The Replit screenshot browser cannot create a WebGL context and therefore showed the app's WebGL-unavailable notice. A separate Chromium run with SwiftShader verified that the renderer and Cinder Row menu can initialize. SwiftShader measured about **9.9 FPS** at the emulated mobile viewport; this is not a device-performance result and is too slow to certify timed gameplay.

The production web build still reports a large Three.js vendor chunk (558.57 kB minified, 137.93 kB gzip). No gameplay performance target was established or certified.

## Remaining blockers

- No two-authenticated-browser match was played end to end. API tests verify creation, team assignment, opposing spawns, and the relay state machine, but not live network feel.
- REST input/snapshot polling is a prototype transport, not production competitive netcode.
- Respawn, reconnect handling, rematches, team balancing after disconnects, and match-result persistence are not implemented or certified.
- Movement, firing, player damage, and a full 4v4 round were not manually exercised in Cinder Row.
- The Nod descendant-rescue and beacon progression remain separate from the new Cinder Row relay authority.
- The graybox arena is a compact combat slice, not a connected open-world region.

## Recommended next phase

Run an authenticated two-client Cinder Row playtest on hardware with accelerated WebGL. Verify movement, collision, firing, damage, relay capture, round completion, and reconnect/death behavior. Define respawn and rematch rules before expanding to full 4v4 testing or investing in more map content.
