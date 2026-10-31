# Mission To Earth — Phase 1 Stabilization QA Report

**Review date:** 2026-10-24 (America/Chicago)<br>
**Repository:** `niakofa-cmyk/MTE`<br>
**Branch:** `main`<br>
**Reviewed commits:** `0b2fc7bf9bcd6f79eb271e08404c814bd748aab1` (rescue/extraction run) and `340c0dfe1c0967b1227856d6c2d914f3e1a372ab` (Server Loot Run supplement)<br>
**Overall result:** **PARTIAL** — a new real-input run completed the full rescue-to-extraction mission on foot, freed both descendants, raised the beacon, and survived the recovery lock without death, reinsert, or injected state. The local service record saved one extraction (11:51) and survived a page reload. No salvage was collected, so credits and stash rewards remained empty; enemy hit damage, physical-device play, and production behavior remain unverified. The gate-shot tolerance change passes focused tests, but this run does not prove that tolerance was necessary: the initial shots missed because the camera was not aimed at the gate, and aligned shots then breached it.

The rescue/extraction verification below applies to commit `0b2fc7bf9bcd6f79eb271e08404c814bd748aab1`. The Server Loot Run supplement at the end applies to commit `340c0dfe1c0967b1227856d6c2d914f3e1a372ab` on `main`. No gameplay source was changed during the Server Loot Run check.

## Current verification results — 2026-10-24

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Branch and reviewed commit | **PASS** | `main`, base commit `0b2fc7bf9bcd6f79eb271e08404c814bd748aab1`. |
| Typecheck | **PASS** | Workspace typecheck completed without errors. |
| Lint | **PASS** | Mission To Earth ESLint completed without errors. |
| Automated tests | **PASS** | `pnpm test`: Mission To Earth 163 tests and API Server 50 tests; all passed. |
| Production build | **PASS** | Build completed. Three.js vendor chunk is 558.57 kB, above Vite’s 500 kB warning threshold. |
| Built-output HTTP/browser smoke | **PARTIAL** | The production build passed. An earlier build preview returned HTTP 200 and entered descent; this exact rebuilt output was not served separately. The screenshot browser rendered the WebGL-unavailable fallback. |
| Desktop start, movement, look, and collision | **PASS** | Workspace Chromium with SwiftShader started the game. Real keyboard movement and mouse look worked; solid geometry blocked off-route movement, and the player completed the mission by steering around those obstructions. |
| Weapon firing and gate breach | **PASS (live gate damage)** | At both Alpha and Omega, Stone Drum fire breached the gate after the camera was aligned and the player then crossed the opening. Focused tests verify modest gate-edge tolerance and that nearer solids still block shots. The live run does not isolate whether the new tolerance was needed. |
| Target hit detection and firearm damage | **PARTIAL** | Destructible-gate damage was observed live. No enemy firearm hit or damage was verified in this run; earlier live guard-damage evidence is preserved in the historical section. |
| Reload behavior | **PASS (prior live check)** | Earlier in-engine desktop testing verified a right-hand reload without changing left-hand ammunition. Reload was not repeated in the current extraction runs. |
| Enemy perception and state timing | **PARTIAL** | AI timing and state-transition tests pass. During the full run, squad members took damage and were downed, but enemy perception/LOS transitions were not recorded directly. |
| Safe-zone movement | **PASS (latest run)** | The 176 m zone remained stable through rescue; after beacon activation it shrank to 20 m while the player completed extraction without an out-of-zone death. A prior post-fix run did die during a blocked direct approach; that route defect is documented below. |
| Compass heading after full rotations | **PASS** | Live yaw beyond one full rotation produced `undefined -128`; heading normalization and wrap/non-finite regression tests are now in place. |
| Rescue mission through beacon | **PASS** | Both descendants were freed through normal interactions. The beacon was raised, and the counter-push cleared. |
| Uninterrupted extraction completion | **PASS** | The player reached the recovery pad on foot and completed the recovery lock without dying, using Reinsert, or injecting position or mission state. Some squad members were downed during the counter-push. |
| Service record persistence | **PASS** | The result screen reported one extraction and a best time of 11:51. `mte-record-v2` stored `extractions: 1`, `best: 711.6459`, `kills: 0`, and `scrap: 0`; the record remained after a full page reload. |
| Salvage and stash reward persistence | **PARTIAL** | This run collected no salvage or weapon pickup. The saved profile correctly remained at 0 credits with an empty stash, so an earned item/credit reward was not exercised in this run. |
| Death/restart behavior | **PARTIAL** | Death and the native Reinsert-at-objective flow were exercised; reinsert preserved mission objectives and carried equipment. Repeated full mission restarts were not tested. |
| Uninterrupted post-fix extraction route | **PASS (one run)** | A full rescue, beacon, and extraction route completed on foot. The player had to steer laterally around collision-blocked direct movement; this verifies one successful run, not all generated routes or mission balance. |
| Mobile movement and simultaneous look | **PASS (browser-emulated)** | At 390×844 with coarse-pointer=true and 5 touch points, simultaneous pointers at `(90, 520)` and `(280, 250)` reached the left movement and right look zones. In the live engine, position changed from `(0, 108.45, 86)` to `(0.56, 98.92, 81.61)` while descending; yaw changed `0 → -0.128` rad and pitch `-0.42 → -0.310` rad. |
| Mobile touch firing | **PASS (browser-emulated)** | Holding the on-screen RIGHT trigger reduced the live right-hand magazine from 34 to 31 (three shots). |
| Mobile extraction interaction | **PARTIAL** | The mobile `INTERACT` button successfully completed a live `E TAKE AMMO` prompt, increasing reserve ammo from 68 to 102. Extraction uses the same engine `virtual.interact` input, but the extraction-lock prompt itself was not reached via touch in this check; the full extraction was verified on desktop. |
| Resource cleanup | **PARTIAL** | Cleanup paths were reviewed, but renderer teardown/remount and GPU-memory behavior were not retested in this pass. |
| Performance | **PARTIAL** | Prior SwiftShader measurements were low and variable, including about 2.8 FPS at 800×450. This run was not an FPS benchmark; it cannot certify normal-device mission pacing. |
| Physical-device and production certification | **NOT TESTED** | No physical device or production deployment was tested. |
| Open-world campaign requirements | **NOT TESTED** | The current bounded generated region does not establish a connected, streaming open-world campaign. |

### Commands and serve results

| Command | Result |
|---|---|
| `pnpm run typecheck` | **PASS** |
| `pnpm run lint` | **PASS** |
| `pnpm test` | **PASS** — Mission To Earth 163 tests and API Server 50 tests; 0 failures |
| `PORT=24152 BASE_PATH=/ pnpm run build` | **PASS** — Three.js chunk warning noted above |
| `git diff --check` | **PASS** |
| `artifacts/mission-to-earth: web` workflow restart | **PASS** — Vite ready at `http://localhost:24152/` |
| Workspace Chromium reload and saved progression readback | **PASS** — after the latest win, the menu loaded and the one-extraction record persisted. The profile had 0 credits and an empty stash because no salvage or weapon pickup was collected. |
| `pnpm --filter @workspace/mission-to-earth exec vite preview --host 0.0.0.0 --port 4174` | **FAIL (environment)** — Vite config requires `PORT`. |
| `PORT=4174 BASE_PATH=/ pnpm --filter @workspace/mission-to-earth exec vite preview --host 0.0.0.0 --port 4174` | **PASS** — served the built application. |
| `curl -sSI http://127.0.0.1:4174/` | **PASS** — HTTP 200. |

The Replit screenshot browser displayed the application’s WebGL-unavailable fallback and logged context-creation errors. The separate workspace Chromium/SwiftShader session successfully ran the game and the production preview; the screenshot-browser limitation is not evidence that the app itself failed to create WebGL.

### Latest uninterrupted live run — 2026-10-24

- Started a fresh mission through the normal menu as Khensu and used only browser keyboard/mouse inputs. No player position, health, mission flag, or save was injected; there was no death or Reinsert.
- At Alpha, the first rifle burst was aimed at nearby wall geometry and did not breach the gate. After aligning the view to the door, Stone Drum fire broke it; movement then crossed the opening and a held E interaction freed Ananda. This demonstrates the ordinary gate-damage path, but does not establish that the new edge tolerance caused the success.
- Repeated the same sequence at Omega: aligned Stone Drum fire broke the gate, the player crossed through it, and a held E interaction freed Nefret.
- Reached the beacon on foot, held E through the counter-push and beacon channel, then followed the extraction route. Direct movement at two points was blocked by solid geometry until the player changed lateral position; the full route was completed without the player dying. Several squad members were downed during the counter-push.
- The recovery lock completed at approximately `(1.0, -136.8)`. The win screen stated that Ananda and Nefret were extracted in 11:51, with 0 Eon Dusk kills and 0 salvage credits.
- Before reload, `mte-record-v2` stored `extractions: 1`, `best: 711.6459`, `kills: 0`, and `scrap: 0`. `mte-mars-v2` stored 0 `martianCredits` and an empty stash. After a full reload, the service record remained at one extraction and the menu displayed “Service record · 1 extraction.” This verifies local record persistence, not a salvage/item reward; this run earned none.
- The supplied Alpha gate note is preserved verbatim under the architecture references. Focused `firstSolidRayHit` tests verify modest gate-only edge tolerance and that a nearer ordinary solid still occludes the gate. The live run did not isolate the tolerance change from camera aiming.
- The run used workspace Chromium with SwiftShader. The separate Replit screenshot browser still cannot create WebGL; no physical phone, tablet, or production deployment was tested.

### Earlier live-run findings — weapon reward persistence

- The first run started from the normal menu, completed both rescues, raised the beacon, and extracted on foot without Reinsert. At the win, `mte-record-v2` contained one extraction, but `mte-mars-v2` had an empty stash despite the carried Veil Rifle. Reload preserved the record and empty stash.
- Root cause: static weapon pickups have a weapon ID but no explicit display label. The extraction path attempted to derive registry identity from the optional label, so the rifle never entered the reward manifest. The engine now resolves unique registry items by weapon ID and uses labels only to disambiguate shared classes. Unit tests cover the mapping, stash commit, and save readback.
- In the post-fix run, real mouse/keyboard inputs fired the Karma-9 into the Alpha gate and the Veil Rifle into the Omega gate. Both gates broke and both descendants were freed; the beacon counter-push was cleared and the signal raised.
- The direct extraction approach became blocked at approximately `(22.5, -19.2)`. Repeated movement did not displace the player; the HUD reported `OUTSIDE 3m`, and the player died as the zone collapsed. The built-in Reinsert button then placed the player at `(0, -138)` with the extraction objective still active. Holding E completed the recovery lock and showed the win screen. This was the game's native mechanic, not injected state, but it is not an uninterrupted post-fix run.
- After that win, the record contained two extractions and the stash contained one `wep_inf_rifle_02` item at durability 100. A full page reload preserved both; the extraction journal was clear. The post-fix reward path is therefore verified in the running game.
- The Replit screenshot browser still cannot create WebGL. The full run was performed in separate workspace Chromium with SwiftShader. No physical phone or production deployment was tested.

### Collision-aware extraction guidance — 2026-10-24

- The generated level places a low cover object directly across the straight extraction bearing from the previously observed stuck position. Player collision was behaving consistently; the HUD was pointing through the obstacle instead of around it.
- Added `ObjectiveNavigator`, which uses the same `movementBlocked` collision test as player movement and caches a waypoint path until a waypoint, objective, or route obstruction changes. The compass now points to the next safe waypoint, the minimap draws detours, and the objective copy tells the player to follow the route line.
- Verified against the actual deterministic `buildWorld()` geometry: the direct segment from `(22.5, -19.2)` to extraction `(0, -138)` is blocked; the path is reachable, its first waypoint is `(20, -18)`, the first leg is clear, and the full route contains 63 waypoints.
- A code-level traversal of the generated route reached extraction in 62 waypoint legs; every segment was clear under the live movement-collision predicate. This verifies geometry and route progression, not a full real-input mission run or safe-zone timing.
- Regression tests cover the obstructed bearing, safe waypoint advancement, re-routing after leaving the path, and changing mission objectives. Current validation: workspace typecheck **PASS**, lint **PASS**, Mission To Earth tests **156/156 PASS**, production build **PASS** with the existing Three.js chunk warning, and `git diff --check` **PASS**.
- Workspace Chromium created WebGL2 and reloaded the updated app at the menu. The screenshot browser still cannot create WebGL, and a full real-input extraction run after this routing change remains unverified.

### Mobile touch-input verification — 2026-10-24

- Reproduced the mission in workspace Chromium at a 390×844 viewport with five touch points and `(pointer: coarse)` enabled before the game engine was constructed. The menu Start button entered a live mission through a touch event.
- Two simultaneous pointer contacts in clear movement/look regions moved the player and changed yaw and pitch in the same run. Pointer events carried non-zero viewport coordinates and were received by the expected overlay zones. The first exploratory gesture had landed on the off-hand fire and weapon-selection buttons, so it did not represent a movement/look-zone test.
- Pressing the visible right-fire button reduced the right-hand magazine from 34 to 31. The browser reported no JavaScript exceptions.
- Added controller regression tests for concurrent move/look pointer independence and interaction hold/release. The touch interaction uses the same virtual `interact` input consumed by mission objectives, but the final extraction prompt/reward was not exercised through touch in a full mission.
- This is browser-emulated evidence only. No physical phone or tablet was tested; the earlier 0,0 coordinates from the screenshot browser are not physical-device evidence.
- Current checks for this pass: workspace typecheck **PASS**, lint **PASS**, Mission To Earth tests **158/158 PASS**, production build **PASS** with the existing Three.js chunk warning, dev workflow **RUNNING** with HTTP 200, and no browser JavaScript exceptions during the touch run.
- Mobile-pass files: `src/game/engine.ts` (pitch diagnostic hook), `src/game/touch-controller.test.ts` (simultaneous input and interaction regressions), and `docs/architecture/references/` (both supplied documents plus adaptation notes).

### Follow-up after rescue-phase zone change — 2026-10-24

- A fresh mission was started through the real menu, with Khensu selected by a mouse click. The player steered the chute, landed, and moved through the generated city using keyboard input.
- The straight-line objective marker led into solid geometry several times. Movement resumed after changing direction and routing around the obstruction; the player was not globally frozen. This run reached the Alpha gate approach but did not breach it or rescue a descendant.
- The zone remained at 176 m and player health at 100% during the pre-beacon approach. This is direct evidence that the rescue phase no longer takes the earlier out-of-zone damage while objectives remain active.
- The gate breach was not confirmed in this run: Q entered cooldown, but the objective remained active. A previous on-foot run did breach both gates and reach the beacon; neither run completed extraction.
- The screenshot browser still cannot create a WebGL context. Workspace Chromium with SwiftShader can run the scene, but its low and variable frame rate is not suitable for certifying timed play.

### Confirmed defects and fixes

- **Safe-zone drift:** The zone center advanced toward its next objective even when player movement did not support that direction. This was reproduced before the fix. `advanceSafeZoneCenter` now limits movement to the player’s velocity component toward the target; tests cover idle input, caps, clamping, and invalid values.
- **Compass wrap:** The HUD added 360 degrees only once, so continued rotation could produce a negative heading and an undefined compass card. `compassHeadingDegrees` now uses full modulo normalization and handles non-finite yaw explicitly.
- **Enemy suspicion timing:** The proposed 30-second patrol-age skip was not confirmed. State-entry age resets were already present; unit tests cover long patrol, suspicion, reacquisition, search, and invalid timing.
- **Beacon pressure:** Repeated channel interruptions were observed, but this pass did not establish whether the cause is a defect or intended encounter difficulty. Treat it as an unresolved gameplay blocker, not a confirmed code bug.
- **Rescue-phase zone collapse:** The safe zone previously shrank before both rescue objectives and the beacon were complete, exposing the long cross-map objective route to damage. Collapse now begins only after the beacon is raised; unit tests cover rescue-phase gating, grace timing, and invalid inputs.
- **Recovered static weapon omitted from extraction manifest:** Confirmed in the first full run. `applyLoot` used an optional label for registry lookup even though static world weapon pickups identify themselves by weapon ID. The engine now resolves the registry from that stable ID; tests and the second live extraction verify that one rifle stash item is persisted with the service record.
- **Extraction path obstruction under a shrinking zone:** Confirmed in the post-fix run. Forward movement at approximately `(22.5, -19.2)` produced no displacement, while the safe zone continued shrinking and the player died. Collision-aware objective guidance now identifies a traversable detour in the generated world; an uninterrupted live mission is still required before calling the overland extraction route reliable.

### Files changed in this pass

- `artifacts/mission-to-earth/src/game/safe-zone.ts` — bound center movement by player velocity and gate collapse until the extraction beacon is raised.
- `artifacts/mission-to-earth/src/game/safe-zone.test.ts` — cover zone movement and rescue/beacon collapse timing.
- `artifacts/mission-to-earth/src/game/navigation.ts` — normalize compass headings after repeated rotations and reject non-finite yaw.
- `artifacts/mission-to-earth/src/game/navigation.test.ts` — add compass wrap and invalid-yaw regression tests.
- `artifacts/mission-to-earth/src/game/engine.ts` — use the safe-zone and normalized compass helpers, clarify drop steering, resolve extracted weapon rewards from stable IDs, and route firearm solids through the gate-aware first-hit check.
- `artifacts/mission-to-earth/src/game/world-physics.ts` — add a small door-only shot tolerance that applies only when the door remains the first solid hit.
- `artifacts/mission-to-earth/src/game/world-physics.test.ts` — cover door edge tolerance and confirm nearer/tied non-door solids still occlude shots.
- `artifacts/mission-to-earth/src/game/mars-stash.ts` — map unique weapon IDs to registry items and disambiguate shared classes by label.
- `artifacts/mission-to-earth/src/game/mars-stash.test.ts` — cover static weapon registry mapping and stash filing.
- `artifacts/mission-to-earth/src/game/mission-progress.test.ts` — verify weapon rewards persist with the extraction service record.
- `artifacts/mission-to-earth/src/game/touch-controller.test.ts` — verify simultaneous mobile movement/look and extraction interaction hold/release.
- `artifacts/mission-to-earth/docs/architecture/references/alpha-gate-breach-fix.txt` — preserve the supplied gate-breach review verbatim.
- `artifacts/mission-to-earth/docs/architecture/references/README.md` — catalog the supplied gate-breach reference.
- `artifacts/mission-to-earth/docs/qa/phase-1-stabilization-report.md` — current results and historical record.

No commit or push was made during this QA pass.

## Previous verification record (2026-10-23; historical)

- The reported 30-second patrol suspicion skip was **not reproduced**. The current state transition helper already resets age when entering a new state, and the engine uses that state age.
- A separate timing-input defect was confirmed: `Math.max(0, NaN)` remains `NaN`, allowing invalid age or frame-time input to contaminate AI timing. Timing inputs are now normalized to finite, non-negative values.
- The gameplay loop was exercised in the running Three.js game. Combat, collision, death/reinsert, mission objectives, the win screen, and browser-local save data were observed.
- A real-input attempt rescued both descendants and raised the beacon, but deaths followed by the game’s own Reinsert action placed the player at later objective checkpoints. This is not evidence of an uninterrupted on-foot route.
- The pre-fix live win left the saved extraction count unchanged. The win path now saves and verifies the service record before applying profile rewards, so a profile-save failure cannot silently prevent the extraction record from being written. Storage-level integration tests cover both successful persistence and a failed profile write; a post-fix full browser win is still pending.
- The game is a bounded generated combat region, not a verified open-world campaign or production-ready release.

## Requirement results

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Identify current branch and commit | **PASS** | `main`, `716d50eb8036463a2ff611e7a83313a143cfc616`. |
| Review movement, camera, collision, weapons, damage, AI, mission flow, touch input, progression, and cleanup | **PASS** | Source review plus the runtime checks below. |
| Ensure patrol time cannot skip suspicion | **PASS** | Source already reset state age on entry; a 30-second patrol regression and live-engine check both entered suspicion with age reset. |
| Verify suspicion, sustained sight, cover loss, sound, search, reacquisition, and return to patrol | **PASS** | AI unit tests cover these transitions; live engine checks covered detection, engagement, loss of sight, investigation, and hearing a shot. |
| Handle large, negative, and non-finite timing values | **PASS** | Added finite/non-negative normalization and regression tests. |
| Start, move, look, and collide with solid geometry | **PASS** | Desktop WASD movement and mouse look worked. Movement stopped against a solid box at `z=74.505`, before its collision boundary. |
| Fire, reload, and damage the intended target | **PASS** | Both mouse buttons fired separate hands; a guard lost 103.2 health. Reloading the right hand did not reload the left. |
| Enemy detection, attack, and reaction to lost sight | **PASS** | A guard entered suspicion, engaged after sustained sight, attacked, then changed to investigate when a wall blocked sight while retaining its last-known position. |
| Player damage, death, and restart | **PASS** | Live enemy damage caused death; the actual Reinsert control returned the player to ground play. Three UI start/abort cycles returned to the menu with active actors cleared and the canvas count stable at two. |
| Complete the entire mission without QA shortcuts | **PARTIAL** | Movement, gate fire, and rescues used real keyboard/mouse inputs; no test code changed player position or mission flags. After deaths, the game’s Reinsert action placed the player at Omega, then at the beacon, then at extraction. The win screen was reached, but the Omega-to-beacon and beacon-to-extraction routes were not traversed on foot. |
| Grant extraction rewards only once | **PARTIAL** | The pre-fix live run reached the win screen without updating the record. The engine’s win guard still prevents a second win event in the same run; the new persistence helper and storage integration tests cover one successful commit, but duplicate-win and post-fix browser behavior have not been re-run. |
| Save and load progression | **PARTIAL** | The new integration test confirms record/profile readback from browser-style local storage and confirms a profile write failure does not block recording the extraction. A full post-fix browser win is still needed. Saves remain browser-local, not server-authoritative or cross-device. |
| Verify mobile browser controls | **PASS (emulated)** | At 390×844 with touch emulation, the rendered movement zone moved the player, the right zone changed yaw and pitch, both touch fire buttons fired, and focus activated. No physical phone was used. |
| Verify resource cleanup | **PARTIAL** | `destroy()` cleanup was reviewed; three mission abort/start cycles kept two canvases and reset actors. Renderer teardown/remount and GPU-memory behavior were not instrumented. |
| Measure ordinary and demanding encounter performance | **PARTIAL** | Measured in headless Chromium with SwiftShader software WebGL; these numbers are not representative of physical hardware. See measurements below. |
| Serve and exercise the production build | **PASS** | Vite preview returned HTTP 200; the built app created WebGL2 and entered gameplay. |
| Physical-device certification / production readiness | **NOT TESTED** | No physical device or production deployment test was performed. |
| Open-world campaign requirements | **NOT TESTED** | The current bounded generated region does not establish streamed regions, persistent faction control, enterable interiors, or a world-changing campaign. |

## Automated checks

The latest mission-app checks were run after the extraction-persistence change. The API checks below are from the baseline review; no API source was changed by this follow-up.

| Command | Result |
|---|---|
| `pnpm --filter @workspace/mission-to-earth run typecheck` | **PASS** |
| `pnpm --filter @workspace/mission-to-earth run lint` | **PASS** |
| `pnpm --filter @workspace/mission-to-earth run test` | **PASS** — 132 tests, 28 suites, 0 failures |
| `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/mission-to-earth run build` | **PASS** — production build completed; Vite emitted the documented large-chunk warning |
| `pnpm --filter @workspace/mission-to-earth run build` | **FAIL (environment)** — required `PORT` was not provided |
| `PORT=4173 pnpm --filter @workspace/mission-to-earth run build` | **FAIL (environment)** — required `BASE_PATH` was not provided |
| `git diff --check` | **PASS** |
| `pnpm --filter @workspace/api-server run typecheck` | **PASS** |
| `pnpm --filter @workspace/api-server run test` | **PASS** — 50 tests, 0 failures |
| `pnpm --filter @workspace/api-server run build` | **PASS** |

The game build reports a Three.js vendor chunk of **558.57 kB** (137.93 kB gzip), above Vite's 500 kB warning threshold. The API build also emits a 1.5 MB entry bundle. These are warnings, not build failures; no bundle refactor was attempted without representative device measurements.

## Gameplay and browser evidence

### Desktop and built output

The running game used WebGL2 in workspace Chromium. WASD movement, pointer-locked mouse look, collision, firing, hit damage, reload, enemy attack, death, and reinsertion were exercised in the actual engine. The built output was served with Vite preview: its home screen loaded, the Start button entered gameplay, two canvases were present, and the page created a WebGL2 context. The built-output smoke test recorded no JavaScript exceptions or console errors.

The desktop player moved from `z=86` to `z=83.815` during movement input. A solid-geometry check stopped movement at `z=74.505` rather than passing through the box. Right-hand ammunition changed from 34 to 32 and left-hand ammunition from 14 to 13 during the firing check; a targeted guard changed from 500 to 396.8 health. A right-hand reload restored that magazine while leaving the left-hand magazine unchanged.

### Mobile emulation

The successful mobile pass used Chrome device emulation and pointer events sent to the game's rendered touch controls. The player moved from approximately `z=-62` to `z=-63.9`; yaw and pitch both changed; right- and left-hand ammunition each decreased by one; focus activated. This verifies the UI-to-engine path in emulation, not native touch behavior on a physical device.

The follow-up objective cue was also checked at 402×874 CSS pixels. Its objective, relative-bearing, and sector text occupied a 257px row inside the HUD without horizontal overflow. This was browser device emulation, not physical-device testing.

### Mission, extraction, and persistence

The no-test-teleport attempt began at the normal drop. Real WASD/sprint and mouse inputs moved the player to the Alpha gate; mouse fire destroyed it and a held E interaction freed Ananda. Enemy fire killed the player shortly after. Reinsert preserved Ananda and placed the player at Omega. The Omega gate was destroyed with real fire and Nefret was freed with a held E interaction.

The player later died during the beacon counter-wave. Reinsert placed the player at the beacon, where holding E raised it. After another death, Reinsert placed the player directly on the extraction pad at `(0, -138)`. The recovery lock then completed automatically and displayed the win screen. This confirms the objective and win state transitions, but not the intended overland route or a survivable uninterrupted run.

The browser save before that win held 2 extractions, 160 scrap, 160 credits, and one stash item. After the win and File the report action, those values were unchanged. The expected new extraction was not recorded in this run. No test code altered player coordinates, health, actors, or objective flags; the jumps came from the game’s Reinsert mechanic.

### Post-fix browser attempt

The post-fix attempt ran on commit `3df435ac1b10296c3f97dc08613fa55591cd865f` in workspace Chromium with WebGL2. The game launched from its normal menu and entered the mission. Pointer lock, camera look, movement, solid-geometry blocking, separate left/right firing, ammo pickup, and reload behavior were exercised with real browser input. The player moved around the Red Veil Compound, but remained on the CRADLE ALPHA objective with Ananda and Nefret still caged. Firing toward the apparent gate and repeated interaction attempts did not produce an observed breach or rescue transition; the correct gate/line of sight was not conclusively identified. The player could move away and strafe, so a global movement lock was not reproduced; objective navigation at the compound remains unclear.

This attempt did not reach the win screen. Once-only extraction rewards, saved progression after a post-fix win, reload persistence, death/restart, and the remaining mission objectives are **NOT TESTED** in this run. No coordinates, health, actors, objective flags, or saves were injected or modified. Browser console output contained only Vite reconnect messages; no game runtime exception was observed.

On commit `d37dbce5ae98e80d4c8bba11ffe04b5111578878`, the objective HUD now labels the actual target type and relative bearing instead of showing an unlabeled distance beside the sector. A normal Start and descent in WebGL2 workspace Chromium showed `LANDING 168 m · RIGHT`; after landing, the cue updated to `GATE 168 m · RIGHT` for CRADLE ALPHA. The canvas retained pointer lock. Unit tests cover cardinal directions, yaw-relative direction, north-angle wrap, a coincident target, and non-finite inputs. This verifies the cue, not the full gate/rescue/extraction route.

The save remains client-local and uses compatibility identifiers such as `mte-mars-v2` and `martianCredits`.

The follow-up persistence implementation stages the complete next service-record and reward-profile snapshots in a versioned browser-local journal before updating either save. Startup replays a valid pending snapshot before loading progression; failed or invalid journals remain in place and raise the existing save warning. Unit tests cover partial writes, replay, staging failure, and invalid journals. This is a best-effort local recovery layer, not a server WAL, database transaction, anti-cheat boundary, or cross-device save. A complete browser extraction after this change has not yet been verified.

### AI timing and combat behavior

The integrated check began with a patrol age of 30 seconds and a visible player. The guard entered `suspicious` with age reset, progressed to `engage` only after sustained sight, and changed to `investigate` behind a wall while retaining the last-known location. A shot heard behind cover also caused investigation. The unit suite covers the full patrol → suspicious → engage → investigate → search → patrol sequence, reacquisition, sound-only alerts, large frame deltas, and invalid timing values.

The actual patrol-age skip was absent in the reviewed source path. The change hardens the AI against `NaN`, infinite, and negative age/delta inputs instead of rewriting already-correct state-entry behavior.

## Performance and diagnostics

Measurements used 780×437 headless Chromium with SwiftShader software WebGL, approximately 3.2 seconds per sample:

| Scenario | Active actors | Frames | Mean frame time | P95 frame time | Approx. FPS |
|---|---:|---:|---:|---:|---:|
| Ordinary mission scene | 14 total, including 11 security actors | 33 | 98.43 ms | 183.4 ms | 10.2 |
| Demanding, QA-positioned encounter | 14 total, 11 security actors positioned around the player and set to engage | 31 | 103.88 ms | 183.4 ms | 9.6 |

The slow rates are a warning for follow-up profiling, not a valid hardware performance verdict. No frame-rate target or physical-device benchmark was supplied.

The built-app Chromium run had no JavaScript exceptions or console errors. The separate Replit screenshot renderer cannot create a WebGL context and showed the game's explicit “WebGL unavailable” fallback, with corresponding Three.js context errors. That is a limitation of the screenshot browser; the WebGL-enabled workspace Chromium ran the game. The web and API workflows were restarted successfully after their earlier duplicate-port (`EADDRINUSE`) failures. The web endpoint and API `/api/healthz` returned HTTP 200 afterward.

## Files changed

- `artifacts/mission-to-earth/src/game/enemy-ai.ts` — normalize invalid and negative age/delta values.
- `artifacts/mission-to-earth/src/game/enemy-ai.test.ts` — add state-sequence, reacquisition, large-delta, and invalid-time regression coverage.
- `artifacts/mission-to-earth/src/game/Mission.tsx` — recover pending local extraction saves before loading progression; retain verified win writes and objective bearing.
- `artifacts/mission-to-earth/src/game/engine.ts` — display objective type, range, and relative direction.
- `artifacts/mission-to-earth/src/game/navigation.ts` — calculate safe, yaw-relative objective direction.
- `artifacts/mission-to-earth/src/game/navigation.test.ts` — cover objective direction math and invalid inputs.
- `artifacts/mission-to-earth/src/game/local-storage.ts` — safely remove a local staging journal.
- `artifacts/mission-to-earth/src/game/mission-progress.ts` — stage, replay, and verify complete local extraction snapshots.
- `artifacts/mission-to-earth/src/game/mission-progress.test.ts` — cover interruption recovery, staging failure, invalid journals, and readback verification.
- `artifacts/mission-to-earth/docs/architecture/persistence-reliability-reference.md` — record the adapted persistence design and server-authority boundary.
- `artifacts/mission-to-earth/src/game/touch-controller.ts` and `touch-controller.test.ts` — use and test an 85%-of-stick-radius sprint threshold.
- `artifacts/mission-to-earth/src/game/player-kinematics.ts` and `player-kinematics.test.ts` — cap touch sprint at 2.2× while retaining the standard 1.5× sprint multiplier.
- `artifacts/mission-to-earth/src/game/Mission.tsx` — use the new touch sprint default and migrate the previous default threshold.
- `artifacts/mission-to-earth/src/game/engine.ts` — apply the mobile-only sprint multiplier through existing engine movement.
- `artifacts/mission-to-earth/src/game/touch-overlay.css` — add pressed feedback to the existing touch fire buttons.
- `artifacts/mission-to-earth/docs/architecture/references/mobile-threejs-controls-demo.html` and `references/README.md` — preserve the supplied HTML and document safe adaptation boundaries.
- `artifacts/mission-to-earth/docs/qa/phase-1-stabilization-report.md` — this report.

## Remaining blockers and recommended next phase

1. Replay the mission with the new collision-aware objective guidance and verify an uninterrupted on-foot extraction without Reinsert. The generated-world path test passes, but full live traversal remains unverified.
2. Complete a mobile touch run through rescue, beacon, and extraction; verify the on-screen interact hold and reward confirmation on the extraction pad.
3. Verify companion/follower spacing during the uninterrupted run and certify controls on a physical mobile device.
3. Profile representative desktop and low-end mobile hardware. The SwiftShader measurements above are software-rendering diagnostics, not device certification.
4. Keep progression local for the prototype. If accounts or valuable shared rewards are introduced, move reward validation and inventory authority to the server with duplicate-claim protection.
5. Do not claim an open-world campaign or production readiness until streaming, world persistence, device performance, and the complete campaign flow are implemented and verified.

## Attached Three.js HTML reference follow-up (2026-10-24)

The supplied HTML was read in full and saved as `docs/architecture/references/mobile-threejs-controls-demo.html`. It is a standalone scene/demo, not the running game's implementation.

The mobile movement/look input, muzzle mesh, recoil, audio, ACES tone mapping, fog, bloom, and reduced touch-device pixel ratio already existed in the game. I retained those systems and added only the missing 85%-of-stick sprint threshold (48px for the game's 56px input radius), a 2.2× touch sprint cap, legacy-default migration, and pressed-state feedback on the fire buttons. Keyboard sprint remains 1.5×.

The demo's immediate camera-position AABB extraction was deliberately not copied: it would skip rescue/beacon requirements, the existing recovery lock, and the mission reward flow. Its additional point lights and full-screen muzzle flash were also not added to the mobile render path without measured need.

### Follow-up verification

- `pnpm run typecheck`: **PASS**.
- `pnpm run lint`: **PASS**.
- `pnpm run test`: **PASS** — 160 game tests and 50 API tests. A first run caught an invalid test pointer sequence; the regression was corrected and the full suite passed.
- Bare `pnpm run build`: **FAIL** because the artifact requires `PORT`; rerun with `PORT=24152 BASE_PATH=/ pnpm run build`: **PASS**. The existing Three.js bundle-size warning remains.
- 390×844 browser touch emulation in the WebGL-enabled workspace Chromium: **PASS** — after landing, a 47px drag moved from `z=86` to `z=84.539` at 4.883 horizontal units/s; a 48px drag moved to `z=79.393` at 11.056 units/s (2.26× observed, including the small input-distance difference).
- Physical mobile-device certification and FPS profiling: **NOT TESTED**.
- The separate screenshot browser could not create WebGL and showed the game's WebGL-unavailable fallback; the workspace Chromium/SwiftShader session successfully ran the real mission engine and touch input.

### Latest uninterrupted run attempt — 2026-10-24

**Observed base:** `main` at `0b2fc7bf9bcd6f79eb271e08404c814bd748aab1` (before the narrative-reference documentation edits).

- Started a new mission through the normal menu in workspace Chromium with SwiftShader at 1024×720. Movement and mouse-look reached the live mission engine; solid walls blocked movement. No death, restart, reinsert, direct mission-state mutation, or debug shortcut was used.
- The player navigated around the west/south exterior and reached Cradle Alpha. The mission remained in **BREACH** with Ananda and Nefret still caged.
- Normal right-hand firing reduced the visible magazine and triggered its normal reload, but the gate did not visibly break and the mission phase did not advance. Because this run did not expose a verified hit/damage result for the gate, the cause is **unconfirmed**; gate breach is **PARTIAL**, not a proven raycast or damage defect.
- The run stopped at Alpha. Omega rescue, beacon activation, enemy attack/line-of-sight reactions, extraction, reward issuance, save/reload, and repeated restarts were **NOT TESTED** in this run. No extraction rewards were claimed or progression data cleared.
- Browser and workflow logs showed Vite connecting/connected only; no browser runtime exception was observed. This run did not measure frame rate.

The new post-rescue campaign-transition brief is preserved under `docs/architecture/references/`. Sanctuary unlocking and a new campaign transition remain deferred until a clean rescue-to-extraction run is completed and saved rewards are verified. This attempt does not certify that gate or the full mission flow.

### Live enemy damage and frame-pacing follow-up — 2026-10-24

- **Automated combat coverage: PASS.** The targeted `combat-damage`, `combat-feedback`, and `enemy-ai` suites passed: 21/21 tests. These verify hit-zone damage calculations, combat feedback classification, and enemy perception/state behavior; they do not prove the rendered weapon ray damages a live enemy.
- **Earlier live enemy attempt: NOT VERIFIED at that time.** The player’s displayed kill count remained `0 DOWN`. A mobile fire attempt spent ammunition without a confirmed hit or defeat reaction. On the later attempt, the nearest hostile was 93.6 m away, beyond the KARMA-9’s configured 70 m range; a desktop mouse-down did not consume ammunition. The controlled result below supersedes this earlier combat status.
- **Desktop active-mission frame pacing: MEASURED, software-rendered.** Workspace Chromium used ANGLE/SwiftShader at 800×450 CSS pixels. During the active drop with 11 hostiles, the 7 s sample recorded 7.68 RAF frames/s (mean 130.24 ms, median 133.2 ms, p95 266.7 ms). A later ground-scene sample with 7 hostiles recorded 8.37 frames/s (mean 119.51 ms, median 116.7 ms, p95 250 ms).
- **Mobile-emulated frame pacing: MEASURED, software-rendered.** At 390×844 CSS pixels with touch emulation and 5 hostiles at sample start, the 5 s sample recorded 7.95 RAF frames/s (mean 125.83 ms, median 133.3 ms, p95 250 ms). This was not a verified firing or hit test.
- **Performance interpretation: PARTIAL.** These measurements establish that the test scene runs in the available browser, but SwiftShader is a software renderer and the observed rates are not representative of a physical GPU. They cannot certify desktop or mobile hardware performance. No physical-device test was performed.

**Earlier follow-up conclusion:** Frame pacing was measured within the available software-rendered browser, but the first live enemy attempt could not verify damage or defeat.

### Controlled in-range enemy damage and defeat check — 2026-10-24

- Started a fresh mission through the normal menu in workspace Chromium and waited for the ground phase. The player was at `(0, 0, 86)` with 9 hostiles at the test baseline.
- Used a development-only fixture to position one guard 5.95 m away in an unobstructed firing lane and hold the target and other NPCs stationary during the check. The test action called the engine’s real weapon-shot path (`tryShootHand` → `fireRay` → `hurtActor` / `killActor`); it did not simulate or directly assign shot damage. This fixture is an engine integration check, not a normal mouse/touch input test.
- **Nonlethal hit: PASS.** A KARMA-9 shot reduced target health from 100 to 87, set the hurt reaction to `0.1`, kept the guard alive, and reduced the magazine from 34 to 33.
- **Defeat: PASS.** After resetting the fixture target to 13 HP, the next shot reduced it to 0 HP, marked it dead, increased the in-game kill count to 1, and reduced the magazine from 33 to 32.
- **Fixture cleanup: PASS.** The target was removed from the fixture, the player returned to `(0, 0, 86)`, hostile count returned to 9, the kill display returned to `0 DOWN`, and the weapon display returned to 34/68. No test loot was granted.
- The first browser assertion script had a bookkeeping error because it did not capture the baseline kill count. The assertion was corrected and the complete damage/defeat/cleanup check passed on rerun.
- Production-bundle inspection found no combat-fixture API or test-target marker in the emitted JavaScript. The fixture hooks are development-only.

This verifies the live engine’s hit, hurt-reaction, and defeat path for one stationary, in-range KARMA-9 target. It does not certify enemy damage across every weapon or hit zone, the mouse/touch firing path in this fixture, the full rescue/extraction mission, or physical-device performance.

### Final fixture verification — 2026-10-24

- **Typecheck: PASS.** `pnpm run typecheck`.
- **Lint: PASS.** `pnpm run lint`.
- **Automated tests: PASS.** `pnpm run test` passed 163 Mission To Earth tests and 50 API tests (213 total).
- **Production build: PASS.** `PORT=24152 BASE_PATH=/ pnpm run build`. Vite emitted its chunk-size advisory for the 558.57 kB Three.js vendor chunk; this is a warning, not a build failure.
- **Development browser smoke: PASS.** After restarting the web workflow, workspace Chromium loaded the app, created a canvas, exposed the development-only test hook, and reported no JavaScript exceptions. The SwiftShader session is software-rendered.
- **Preview-browser limitation: PARTIAL.** The screenshot browser cannot create a WebGL context and shows the app’s WebGL-unavailable fallback. The separate workspace Chromium run successfully rendered and exercised the live game. No physical-device certification was performed.
- **Production fixture isolation: PASS.** A scan of emitted game JavaScript found no development combat-fixture API or test-target marker.
- **Diff hygiene: PASS.** `git diff --check`.

### Server Loot Run end-to-end supplement — 2026-10-24

**Reviewed HEAD:** `340c0dfe1c0967b1227856d6c2d914f3e1a372ab` on `main`.<br>
**Test method:** The actual Server Loot Run menu flow in workspace Chromium with SwiftShader, through the Replit-routed preview and live API service. Inputs were dispatched as ordinary keyboard events; read-only development telemetry was used to observe the player position. Idle-menu rendering measured 8 FPS at 320×240, so this is interaction testing, not performance or physical-device certification.

| Check | Result | Evidence |
|---|---|---|
| Start Server Loot Run | **PASS** | The menu created a match (`POST /api/matches` 201), joined the player (201), and loaded gameplay state (200). |
| Live movement and match input | **PASS** | WASD moved the player from the initial `(0, 86)` area toward the loot. Match input requests returned 202 and snapshots returned 200 during play. The first direct-to-Vite `/api` probe returned 404 because it bypassed Replit’s artifact router; the actual preview-routed game flow succeeded. |
| Claim server loot | **PASS** | Within interaction range, the HUD showed `E TAKE SHROUD BARREL`. The server claim returned 200 with `map-loot-0053` (`SHROUD BARREL`, 120 scrap); the server cache displayed one item. |
| Death and reinsert | **PASS (inventory retention)** | The player was killed before reaching a terminal. The normal Reinsert flow returned to gameplay and retained the one-item server cache. |
| Restore after page reload | **PASS** | Starting Server Loot Run again restored the existing session without creating a new match. Snapshot and world-state requests returned 200; the snapshot returned the existing player position, the inventory still contained one item, and the claimed loot spawn was unavailable. |
| Terminal opening in live gameplay | **PASS** | As Khensu, the player reached `terminal-01` at `(60, 20)` from the `(0, 86)` spawn using WASD and sprint. At `(59.10, 20.57)`, the HUD showed `E CRACK TERMINAL`; pressing E issued `POST /terminals/terminal-01/open` and returned 200. The next server state marked it `opened` and listed four generated drops (`map-loot-0088` through `map-loot-0091`). |
| Terminal drops and claims | **PASS** | The HUD exposed `OVERCHARGED CAPACITOR`; its claim returned 200 and raised server inventory to 2. The mod did not fit the active weapon, but remained in the server cache. The next prompt exposed `SCAVENGER SMG`; its claim returned 200 with 50 scrap and raised inventory to 3. The HUD displayed `SERVER CACHE · 3`. |
| Server cache settlement into durable progression | **FAIL (not implemented)** | The registered API router exposes match-session creation/join/input/snapshot/world-state/loot-claim/terminal-open/leave routes, but no extraction, settlement, or profile-reward route. `MatchSessionManager` and `AuthoritativeGameplayState` keep sessions and inventory in in-memory maps. Solo extraction writes browser-local progression and does not receive this server inventory; the menu also states that server inventory is temporary and solo saves are separate. |
| Browser runtime errors | **PASS (observed window)** | No JavaScript exceptions or console errors were captured during the post-reload gameplay observation. |
| API Server tests | **PASS** | `pnpm --filter @workspace/api-server run test`: 50/50 passed, including server-side proximity/duplicate-claim checks and in-range one-time terminal opening. |
| Mission To Earth tests | **PASS** | `pnpm --filter @workspace/mission-to-earth run test`: 163/163 passed. |

**Overall Server Loot Run result: PASS for the live terminal-to-cache loop; durable settlement is NOT IMPLEMENTED, and performance certification is PARTIAL.** Match creation, real movement input, terminal opening, four server-generated drops, two server-authorized claims, and cache updates were verified. A separate run verified inventory retention through death/reinsert and page reload. The cache is temporary match-session inventory, not a durable account reward. No gameplay defect was confirmed and no game source change was made; this supplement records the evidence and remaining limits.

### Latest rescue-to-extraction run and beacon routing fix — 2026-10-24

**Reviewed state:** `main`, HEAD `340c0dfe1c0967b1227856d6c2d914f3e1a372ab`. The gameplay changes below are in the working tree and are not committed or pushed.<br>
**Files changed:** `src/game/engine.ts`, `src/game/objective-navigation.ts`, `src/game/objective-navigation.test.ts`, and this report.

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Game start, movement, look, and collision | **PASS (workspace Chromium)** | The separate SwiftShader-enabled Chromium session rendered the Three.js game. Real keyboard and mouse input moved and turned the player. Walking directly into solid cover stopped displacement; backing away and taking a clear route restored movement. No persistent input lock was observed. |
| Rescue both descendants | **PASS** | The player breached both gates, freed Ananda and Nefret through normal interaction, and saw both marked `FREE`. |
| Raise beacon and extract | **PASS** | The beacon was raised, the recovery lock reached 100%, and the game entered `win` without death, reinsert, or injected position/mission state. |
| Beacon objective guidance | **FAIL confirmed, fix implemented** | At `(0, 0)`, solid geometry blocked the exact beacon target and the HUD incorrectly said no route existed. A reachable approach at `(2, 0)` is inside the beacon's 3.1 m interaction radius. The engine now finds and caches a reachable standable approach when the objective center is blocked. |
| Safe-approach helper against live world geometry | **PASS** | After the fix and workflow restart, the browser loaded the helper against the generated world: it selected `(2, 0)`, confirmed it was standable, and the objective navigator reported the route reachable. Regression tests cover a blocked objective with a safe approach and a fully obstructed interaction radius. The complete mission was not replayed after this final guidance-only change. |
| Local extraction record persistence | **PASS** | `mte-record-v2` recorded `extractions: 1`, `best: 844.5666` seconds, `kills: 0`, and `scrap: 0`. The same record remained after a page reload. |
| Loot, credits, or stash reward grant | **NOT TESTED** | No salvage or weapon pickup was collected in this run. After reload, the profile still showed 0 credits and an empty stash; this confirms the record save, not an earned-item reward. Server Loot Run cache settlement remains unimplemented as documented above. |
| Typecheck | **PASS** | `pnpm --filter @workspace/mission-to-earth run typecheck`. |
| Lint | **PASS** | `pnpm --filter @workspace/mission-to-earth run lint`. |
| Automated game tests | **PASS** | `pnpm --filter @workspace/mission-to-earth run test`: 167 passed, 0 failed. |
| Production build | **PASS** | `PORT=24152 BASE_PATH=/ pnpm --filter @workspace/mission-to-earth run build`; Vite emitted the existing large Three.js chunk advisory. |
| Preview-browser rendering | **PARTIAL** | The screenshot browser could not create a WebGL context and showed the documented fallback. The separate workspace Chromium session rendered and exercised the actual 3D game. This is not physical-device or GPU performance certification. |
| Mobile physical-device test | **NOT TESTED** | No physical phone or tablet was used in this run. |

**Latest result:** the rescue-to-extraction loop completed in the live game, and the local record survived reload. The verified player “stuck” case was collision with cover plus misleading guidance at a blocked beacon center, not a persistent movement-input failure. The new safe-approach behavior passed automated and live-world geometry checks; an uninterrupted full mission run after that final change remains unverified.

### Account-linked extraction rewards and saved inventory — 2026-10-24

**Reviewed state:** `main`, HEAD `340c0df` at implementation start. The feature and verification changes are in the working tree and are not committed or pushed.

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Replit Auth OIDC login flow | **PASS (live preview sign-in)** | The API log records `/api/login` and `/api/callback`; the callback returned 302, followed by successful `/api/auth/user` and `/api/profile` responses (200). This confirms sign-in and profile loading, but not a server match or extraction. |
| Signed-out auth/profile behavior | **PASS** | Through the game preview proxy, `/api/auth/user` returns `{ "user": null }`; `/api/profile` returns 401 with a sign-in-required response. |
| Server-owned extraction eligibility | **PASS (automated)** | The server tracks a continuous extraction-area hold using match state and grants rewards only for a matching authenticated account and valid match access token. Client-supplied reward payloads are rejected. |
| Durable profile and inventory | **PASS (database integration test)** | Settlement writes profile totals and inventory transactionally to PostgreSQL. The test verifies persisted profile and item data. |
| Duplicate settlement protection | **PASS (database integration test)** | A unique player/match settlement record makes repeat claims idempotent; duplicate settlement does not add credits or items again. |
| Inventory screen | **IMPLEMENTED; signed-in UI NOT TESTED** | The game menu includes a saved-inventory view showing account credits, extraction count, and persisted items. The screenshot browser was signed out and could not render WebGL; no authenticated browser session was available. |
| Server Loot Run to saved rewards | **NOT TESTED end-to-end** | Automated tests cover the match extraction hold and database settlement separately. No authenticated real-browser run exercised the complete mission, server extraction hold, and saved inventory readback in one session. |
| Workspace typecheck | **PASS** | `pnpm run typecheck`. |
| Lint | **PASS** | `pnpm run lint`. |
| Automated tests | **PASS** | `pnpm run test`: 167 Mission To Earth tests and 55 API-server tests passed (222 total). |
| Production builds | **PASS** | API: `pnpm --filter @workspace/api-server run build`. Client: `PORT=24152 BASE_PATH=/ pnpm --filter @workspace/mission-to-earth run build`. The existing Three.js chunk-size advisory remains. |
| Workflow startup | **PASS** | API listens on port 8080 and Vite is ready on port 24152. Auth/profile routes respond through the game preview proxy. |
| Preview rendering | **PARTIAL** | The capture browser displayed the menu and the WebGL-unavailable notice; its console reported failure to create a WebGL context. This is an environment limitation, not a successful 3D gameplay run. |

**Current reward boundary:** the client can display match cache contents, but durable credits and inventory are granted only by the authenticated server settlement path after the server confirms extraction. The earlier “durable settlement is not implemented” finding above records the state of that earlier run; this section supersedes it for the current working tree. A full authenticated extraction-and-readback run remains the main verification gap.

### Extraction recovery and ownership hardening — 2026-10-31

**Reviewed state:** current `main` revision `e919e4d`; the latest QA-report and TypeScript ESM import adjustments remain in the working tree.

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Durable ready receipt | **PASS (automated)** | When the authenticated status route first observes server-validated extraction readiness, it persists a unique player/match receipt containing the server-owned inventory and hold duration before returning `ready: true`. Conflicting later submissions cannot replace that receipt. |
| Recovery after API restart | **PASS (automated)** | A test simulates a fresh match manager with no in-memory session. The receipt owner reads ready status and settles using their authenticated account, without a match token. The database confirms inventory and credits are saved once; a retry is idempotent. |
| Cross-account receipt access | **PASS (automated)** | Route tests reject unauthenticated requests and a different account cannot read or settle the receipt. Live match ownership checks reject a match token paired with another account. |
| Client-forged reward rejection | **PASS (automated)** | Non-empty reward payloads are rejected before settlement; the profile remains unchanged. Settlement reads only the immutable persisted receipt. |
| Full mission-to-reward browser run | **NOT TESTED** | The automated recovery test covers the post-ready restart boundary. A signed-in browser run collecting loot, completing the extraction hold, and reading back the inventory was not observed. |
| Full workspace checks | **PASS** | Typecheck and lint passed; 167 game tests and 55 API tests passed (222 total). |
| Production builds and workflows | **PASS** | API build and `PORT=24152 BASE_PATH=/` game build succeeded. API and Vite workflows restarted successfully; existing Three.js chunk-size warning remains. |

**Recovery guarantee:** once the server returns extraction readiness, the durable receipt exists first and is recoverable after an API restart. A process loss before the server has confirmed readiness does not create a receipt and cannot award rewards. Match simulation state itself remains in memory; this change does not claim to recover an unfinished match.

### Cinder Row private-match invitations and roster — 2026-10-31

**Reviewed HEAD:** `44d385e` on `main`; the changes below are in the working tree and are not committed or pushed.<br>
**Files changed:** API match-session snapshots and tests; the match client, `Mission.tsx`, `CinderRowPanel.tsx`, and panel tests; this report.

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Host creates a private Cinder Row match and shares its ID | **PASS (automated coverage)** | The server API test creates a private room, joins two participants through its match ID, and verifies the server-assigned opposing teams. The game client test covers host/join session handling, and the clipboard helper and panel tests cover displaying/copying the ID. |
| Host sees the joined roster | **PASS (automated coverage)** | Authorized match snapshots now carry server-owned player team, connection state, and room capacity. The menu renders both team rosters, short player identifiers, online/joined status, and per-team capacity. |
| Roster refreshes while waiting in the menu | **IMPLEMENTED; live browser behavior NOT TESTED** | The menu polls the authorized snapshot once per second; active-play snapshots also update roster state. UI tests verify roster content and connection states, but no authenticated browser session was available to exercise a second user joining live. |
| Private versus ranked capacity | **PASS (automated coverage)** | Private matches are explicitly described as 4v4; active match capacity comes from the server snapshot, so ranked 8v8 capacity is not inferred from the ranked selector for a private room. |
| API tests and typecheck | **PASS** | API test suite: 74/74 passed. API TypeScript typecheck passed. |
| Game tests, panel tests, typecheck, and lint | **PASS** | Mission game tests: 170/170; panel tests: 3/3; Mission To Earth typecheck and lint passed. |
| Production web build | **PASS** | `PORT=4173 BASE_PATH=/mission-to-earth/ pnpm --filter @workspace/mission-to-earth run build`. Vite emitted the existing Three.js chunk-size advisory. |
| Workflow restart | **PASS** | API build completed and the server listened on port 8080; the Vite workflow became ready after restart. |
| Authenticated browser host/invitee flow | **NOT TESTED** | The capture browser was signed out, so the Cinder Row action was disabled. Authentication was not bypassed. |
| 3D preview and physical-device test | **PARTIAL / NOT TESTED** | The screenshot preview showed the signed-out menu but could not create a WebGL context. No physical device was used. |

**Result:** host/join and roster data are covered by API/client/UI tests, and the host menu now has a server-refreshed roster. The actual two-authenticated-browser invitation flow remains unverified; these results do not certify production multiplayer or physical-device behavior.

### Build and renderer warning cleanup — 2026-10-31

**Reviewed revision:** `cfc0f8d`.

| Finding | Result | Evidence / qualification |
|---|---|---|
| Oversized Vite Three.js chunk | **PASS** | Split Three.js core and addons into separate chunks. Production output's largest chunk is 358.31 kB; no Vite chunk-size warning is emitted. |
| Oversized API bundle warning | **PASS** | Externalized installed runtime dependencies while keeping workspace packages and Pino worker handling intact. The latest server bundle is 640.7 kB; the API build emits no large-bundle warning. |
| API root 404s | **PASS** | Added a public root health response. After restart, `GET /` returned HTTP 200 with `{"service":"mission-to-earth-api","status":"ok"}`; `/api/auth/user` also returned 200. |
| Unsupported WebGL capture browser | **PASS (graceful fallback)** | A WebGL2 capability probe now prevents constructing the renderer when the browser cannot provide WebGL2. The preview shows the existing explanatory fallback without page-console renderer errors. |
| WebGL-capable software-rendered browser | **PASS (compatibility only)** | Workspace Chromium with SwiftShader produced two canvas elements, did not show the fallback notice, and logged no renderer errors. Chromium itself emitted container D-Bus/GCM diagnostics; these are not page errors. This is not physical-GPU performance certification. |
| Automated checks | **PASS** | Mission tests: 172/172; UI tests: 3/3; API tests: 74/74; both artifacts' typechecks passed; Mission To Earth lint passed. |
| Intentional API security warning | **RETAINED** | The API tests log a warning when a deliberately wrong account tries to authenticate a match socket. This is expected rejection telemetry, not an application failure, and remains enabled. |
| Physical-device WebGL behavior | **NOT TESTED** | No desktop GPU or mobile device was available for this verification. |

**Result:** the reproducible Vite chunk advisory and API bundle-size warning are cleared, the API root returns a healthy response, and the unsupported preview browser now fails gracefully without renderer-console errors. Its visible no-WebGL notice remains accurate for that browser.

### Bundle, browser-smoke, and performance follow-ups — 2026-10-31

| Follow-up | Result | Evidence / qualification |
|---|---|---|
| Bundle-size regression guard | **PASS** | Root `pnpm run build` now runs `check:bundle-size`. Browser chunks are capped at 500 kB each; API JavaScript outputs at 1,000 kB each. Latest output passed: largest browser chunk 358.3 kB; API entry 640.7 kB. |
| Desktop browser smoke | **PASS (automated)** | Chromium at 1280×900 loaded the menu and invoked solo deployment; WebGL2 was available, two canvases were present, a WASD key event was delivered, and no page exceptions, console errors, or console warnings were captured. |
| Mobile browser smoke | **PASS (emulated input)** | Chromium at 390×844 activated the coarse-pointer layout. The movement zone displayed its virtual stick after a simulated touch drag; look-zone and fire-button touch events were dispatched. This does not certify physical touch or independently assert camera rotation, player displacement, or weapon damage. |
| Software-rendered frame sample | **NOT A PERFORMANCE CERTIFICATION** | Latest forced SwiftShader sample: desktop 4 animation frames over 2.5 seconds (p50 516.7 ms, p95 600.0 ms); mobile 6 frames (p50 400.0 ms, p95 583.2 ms). These slow, software-only readings are not representative of GPU gameplay performance. |
| Real-GPU Nod/Cinder Row performance | **NOT TESTED** | This workspace exposes no `/dev/dri` device or `nvidia-smi`; no physical GPU or mobile device was available. The browser harness supports `MTE_RENDERER_MODE=hardware` to avoid forcing SwiftShader, but hardware measurements must be run on an actual GPU. Cinder Row remains account-gated and was not accessed by bypassing authentication. |
| Full interactive objective/extraction flow | **NOT TESTED** | The browser smoke covers rendering and input delivery only. It does not complete the rescue, extraction, or reward flow. |

The reproducible commands are `pnpm run check:bundle-size` and `pnpm run qa:browser-smoke`; the browser smoke expects a running app at `MTE_SMOKE_URL` (default `http://127.0.0.1:80/`). Set `MTE_RENDERER_MODE=hardware` when collecting measurements on an actual GPU. The full workspace build passed with its required `PORT=4173` and `BASE_PATH=/mission-to-earth/` values; a bare `pnpm run build` stops in Vite config validation when these workspace variables are absent.
