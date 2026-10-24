# Mission To Earth — Phase 1 Stabilization QA Report

**Review date:** 2026-10-23 (America/Chicago)<br>
**Repository:** `niakofa-cmyk/MTE`<br>
**Branch:** `main`<br>
**Reviewed commit:** `716d50eb8036463a2ff611e7a83313a143cfc616`<br>
**Follow-up gameplay/UI commit:** `d37dbce5ae98e80d4c8bba11ffe04b5111578878`<br>
**Follow-up persistence commit:** `e758857393e16c51a7c486c2c0635b4d9c7755b7`<br>
**Overall result:** **PARTIAL** — automated checks and core controls passed. A real-input mission run reached the win screen using the game’s Reinsert checkpoints, but skipped parts of the route and exposed a missing saved extraction record. The win-save path now stages and replays local snapshots, with focused interruption tests. A post-fix browser attempt did not free Ananda or reach extraction, so live post-win persistence remains unverified.

The reviewed commit is the repository baseline. The AI timing and extraction-persistence changes described below are follow-up changes built against that baseline.

## Summary of findings

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
- `artifacts/mission-to-earth/docs/qa/phase-1-stabilization-report.md` — this report.

## Remaining blockers and recommended next phase

1. Complete a post-fix browser extraction. This attempt reached the Alpha area but did not free a descendant or win; verify a once-only reward and saved progression after a real win, then confirm persistence across reload.
2. Run a fresh, uninterrupted browser mission through both rescues, beacon, and extraction without using Reinsert after death. Assert follower spacing, objective progression, once-only rewards, and saved progression.
3. Profile representative desktop and low-end mobile hardware. The SwiftShader measurements above are software-rendering diagnostics, not device certification.
4. Keep progression local for the prototype. If accounts or valuable shared rewards are introduced, move reward validation and inventory authority to the server with duplicate-claim protection.
5. Do not claim an open-world campaign or production readiness until streaming, world persistence, device performance, and the complete campaign flow are implemented and verified.
