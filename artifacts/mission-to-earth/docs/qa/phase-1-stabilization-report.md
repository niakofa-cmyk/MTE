# Mission To Earth — Phase 1 Stabilization QA Report

**Review date:** 2026-10-24 (America/Chicago)<br>
**Repository:** `niakofa-cmyk/MTE`<br>
**Branch:** `main`<br>
**Reviewed base commit:** `2ed9e8e98f0decd8a5bfef8248b805c831a23ffe` (HEAD before this pass)<br>
**Overall result:** **PARTIAL** — a real-input run completed the entire rescue-to-extraction mission without dying, but its rifle was missing from the saved stash. The weapon-ID mapping fix is now verified in a second live extraction: after dying on an obstructed extraction route, the player used the game's native “Reinsert at the objective,” completed the recovery lock, and won. The service record advanced to two extractions and the recovered rifle (`wep_inf_rifle_02`, quantity 1) survived a page reload. An uninterrupted post-fix route remains unverified.

The current QA results are authoritative for this pass. The dated verification record below is historical and is not a certification of the current run. The safe-zone, compass, and weapon-reward fixes are in the working tree and are not included in the reviewed base commit.

## Current verification results — 2026-10-24

| Requirement | Result | Evidence / qualification |
|---|---|---|
| Branch and reviewed commit | **PASS** | `main`, base commit `2ed9e8e98f0decd8a5bfef8248b805c831a23ffe`. |
| Typecheck | **PASS** | Workspace typecheck completed without errors. |
| Lint | **PASS** | Mission To Earth ESLint completed without errors. |
| Automated tests | **PASS** | `pnpm test`: Mission To Earth 152 tests across 31 suites; API Server 50 tests; all passed. |
| Production build | **PASS** | Build completed. Three.js vendor chunk is 558.57 kB, above Vite’s 500 kB warning threshold. |
| Built-output HTTP/browser smoke | **PARTIAL** | The production build passed. An earlier build preview returned HTTP 200 and entered descent; this exact rebuilt output was not served separately. The screenshot browser rendered the WebGL-unavailable fallback. |
| Desktop start, movement, look, and collision | **PARTIAL** | Workspace Chromium with SwiftShader started the game; basic movement and look worked and solid geometry blocked movement. A direct extraction corridor stopped player movement at about `(22.5, -19.2)` until the run ended in an out-of-zone death; it was not a global input lock. |
| Weapon pickup and gate breach | **PASS** | The Veil Rifle pickup equipped the right hand. The first run used Khensu’s Q to breach both gates; the post-fix run broke Alpha with 21 Karma-9 shots and Omega with 14 Veil Rifle shots. |
| Target hit detection and firearm damage | **PARTIAL** | Firearm damage to both destructible gates was verified. No enemy firearm hit was verified in these extraction runs; earlier live guard-damage evidence is preserved in the historical section. |
| Reload behavior | **PASS (prior live check)** | Earlier in-engine desktop testing verified a right-hand reload without changing left-hand ammunition. Reload was not repeated in the current extraction runs. |
| Enemy perception and state timing | **PARTIAL** | AI timing and state-transition tests pass. During the full run, squad members took damage and were downed, but enemy perception/LOS transitions were not recorded directly. |
| Safe-zone movement | **PASS (first run)** | Collapse stayed at 176 m during rescue and began after the beacon was raised. The first on-foot run completed while the zone reached its 20 m floor. In the post-fix run, the player became stuck in a direct corridor and died after going outside the shrinking zone. |
| Compass heading after full rotations | **PASS** | Live yaw beyond one full rotation produced `undefined -128`; heading normalization and wrap/non-finite regression tests are now in place. |
| Rescue mission through beacon | **PASS** | Ananda and Nefret were freed on foot; the beacon was raised through the normal interaction. |
| Post-fix extraction completion | **PASS (with native reinsert)** | Both descendants and the beacon were completed on foot. A blocked extraction approach caused an out-of-zone death; the game's Reinsert button placed the player at the extraction objective. The player then completed the recovery lock and won. The earlier pre-fix run completed without reinsert. |
| Service record persistence | **PASS** | The second win advanced the record from 1 to 2 extractions. After a full page reload, it remained at 2 and the extraction journal was clear. |
| Saved recovered weapon reward | **PASS** | After the post-fix win, the stash contained one `wep_inf_rifle_02` item (`quantity: 1`, durability 100). The item and record survived page reload; no pending extraction journal remained. |
| Death/restart behavior | **PARTIAL** | Death and the native Reinsert-at-objective flow were exercised; reinsert preserved mission objectives and carried equipment. Repeated full mission restarts were not tested. |
| Uninterrupted post-fix extraction route | **PARTIAL** | Collision-aware objective guidance now routes around the obstructing cover. The generated-world check found a clear next waypoint at `(20, -18)` from the reported stuck position, and regression tests cover route progression and off-route recovery. A full post-fix on-foot mission has not yet been replayed. |
| Mobile movement and simultaneous look | **PASS (browser-emulated)** | At 390×844 with Chromium touch emulation and coarse-pointer media enabled, separate movement/look touches moved the player about 1.59 m in X and 7.75 m in Z while changing yaw by −0.256 rad and pitch by +0.219 rad. |
| Mobile touch firing | **PASS (browser-emulated)** | Holding the on-screen right-fire control changed the live right-hand magazine from 34 to 31. No browser runtime exceptions were observed. |
| Mobile extraction interaction | **PARTIAL** | Controller tests verify the touch interaction command holds and releases; a complete extraction prompt and reward flow was not reached using touch in this pass. |
| Resource cleanup | **PARTIAL** | Cleanup paths were reviewed, but renderer teardown/remount and GPU-memory behavior were not retested in this pass. |
| Performance | **PARTIAL** | Prior SwiftShader measurements were low and variable, including about 2.8 FPS at 800×450. This run was not an FPS benchmark; it cannot certify normal-device mission pacing. |
| Physical-device and production certification | **NOT TESTED** | No physical device or production deployment was tested. |
| Open-world campaign requirements | **NOT TESTED** | The current bounded generated region does not establish a connected, streaming open-world campaign. |

### Commands and serve results

| Command | Result |
|---|---|
| `pnpm run typecheck` | **PASS** |
| `pnpm run lint` | **PASS** |
| `pnpm test` | **PASS** — Mission To Earth 152 tests / 31 suites and API Server 50 tests; 0 failures |
| `PORT=24152 BASE_PATH=/ pnpm run build` | **PASS** — Three.js chunk warning noted above |
| `git diff --check` | **PASS** |
| `artifacts/mission-to-earth: web` workflow restart | **PASS** — Vite ready at `http://localhost:24152/` |
| Workspace Chromium reload and saved progression readback | **PASS** — menu loaded with WebGL2; 2 extractions and one rifle stash item persisted; no pending extraction journal |
| `pnpm --filter @workspace/mission-to-earth exec vite preview --host 0.0.0.0 --port 4174` | **FAIL (environment)** — Vite config requires `PORT`. |
| `PORT=4174 BASE_PATH=/ pnpm --filter @workspace/mission-to-earth exec vite preview --host 0.0.0.0 --port 4174` | **PASS** — served the built application. |
| `curl -sSI http://127.0.0.1:4174/` | **PASS** — HTTP 200. |

The Replit screenshot browser displayed the application’s WebGL-unavailable fallback and logged context-creation errors. The separate workspace Chromium/SwiftShader session successfully ran the game and the production preview; the screenshot-browser limitation is not evidence that the app itself failed to create WebGL.

### Current live-run findings — full rescue and extraction

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
- `artifacts/mission-to-earth/src/game/engine.ts` — use the safe-zone and normalized compass helpers, clarify drop steering, and resolve extracted weapon rewards from stable weapon IDs.
- `artifacts/mission-to-earth/src/game/mars-stash.ts` — map unique weapon IDs to registry items and disambiguate shared classes by label.
- `artifacts/mission-to-earth/src/game/mars-stash.test.ts` — cover static weapon registry mapping and stash filing.
- `artifacts/mission-to-earth/src/game/mission-progress.test.ts` — verify weapon rewards persist with the extraction service record.
- `artifacts/mission-to-earth/src/game/touch-controller.test.ts` — verify simultaneous mobile movement/look and extraction interaction hold/release.
- `artifacts/mission-to-earth/docs/qa/phase-1-stabilization-report.md` — current results and historical record.

An unrelated `.replit` module change is present in the working tree and was not included in this pass. No commit or push was made during this QA pass.

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
