# Mission To Earth — Visual Brand Foundation

## Reference and verification record

This document translates the uploaded “Mission To Earth — Forensic Design Audit & Implementation” into a durable product and implementation reference.

- Source attachment: `Pasted-Worked-for-1m-23s-Mission-To-Earth-Forensic-Design-Audi_1793435536569.txt`
- The linked ChatGPT share (`https://chatgpt.com/s/t_6ae5a7b814b881919b21ada1a8b9ef61`) could not be read by the available page fetch or screenshot service; both returned HTTP 402. Its contents are not treated as verified.
- GitHub PR #2 was checked on 2026-10-31. It is open, draft, and unmerged, from `design/mte-cinematic-brand-foundation` at `430c8c4a6563b2d7ef4a9fbe8312f87a6debc742`, targeting `main`.
- The PR changes five files: this visual direction's original implementation touched `Mission.tsx`, `styles.css`, `index.html`, added `brand-system.css`, and added a visual-foundation document.
- The PR head has one completed GitHub check named “Lint, typecheck, test, and build” with a successful conclusion. Its commit-status endpoint separately returned `pending` with no status entries. This is not the same as certification of the current MTE revision.
- The PR was based on an older main revision. Its implementation must be checked against the current code and verified locally before adoption.

## Product identity

Mission To Earth is a cinematic first-person extraction game set in occupied Earth districts. The current playable mission is Operation Shakuna in Nod: an Accord team rescues Ananda and Nefret, raises the beacon, and reaches the recovery pad while Eon Dusk forces respond.

The interface should feel like a field dossier recovered from an occupied district: grounded, tactical, atmospheric, and legible over an active 3D scene. It must not read as a generic neon arcade interface or imply features the game does not yet contain. The current playable setting is Earth; Mars is part of the wider story, not the location of this mission.

## Verified game facts to use in presentation

- The game has a React presentation layer over a Three.js mission engine.
- The current menu provides operator selection, Start, Server Loot Run, Dossier, Armory, Settings, Saved Inventory, and account actions.
- The Dossier includes the cradles, uprising, and beacon story acts.
- The playable opening objective is to free Ananda and Nefret, raise the Accord beacon, and reach the recovery pad.
- The rescue, combat, extraction, server reward, and save systems are existing gameplay. Presentation work must not replace or bypass them.
- Existing social assets include `public/og.jpg`, `public/x-banner.jpg`, and `public/favicon.svg`.
- Existing display and body fonts are Rajdhani and Barlow.

## Visual direction

### Semantic palette

| Token | Value | Use |
|---|---|---|
| Field ink | `#080B0D` | Background and deep shadow |
| Raised panel | `rgba(14, 20, 22, 0.88)` | Command and dossier surfaces |
| Paper | `#E8E5D9` | Primary text |
| Ash | `#A0A59D` | Secondary text and supporting copy |
| Ember | `#E56B45` | Urgent action and extraction emphasis |
| Hot ember | `#FF8A58` | Primary action |
| Accord signal | `#7AD9C5` | Friendly communications and system status |
| Brass | `#D6B36A` | Lineage, records, and rewards |
| Fine stroke | `rgba(193, 206, 195, 0.2)` | Panel borders and dividers |

Color communicates meaning: ember is action/urgency, signal is friendly system information, brass is legacy/reward, and danger red is reserved for actual danger. Avoid decorative use that weakens these meanings.

### Opening and supporting screens

- Make “Mission To Earth” and “Operation Shakuna · Nod Sector 07” recognizable as a single operation identity.
- State the immediate objective concisely: free Ananda and Nefret, raise the Accord beacon, and reach the recovery pad.
- Keep deeper lore in the Dossier; preserve its current story content.
- Give operator selection clear lineage, role, abilities, and selected states. Keep captive lineage cards visibly distinct from selectable operators.
- Apply one typography, border, panel, spacing, focus, and motion language across the menu, Dossier, Armory, Settings, and Saved Inventory without changing their behavior.
- Keep the existing Three.js environment visible enough to establish atmosphere while maintaining text contrast.

### Responsive and accessible behavior

- All menu content must remain scrollable and reachable at narrow phone sizes without covering touch controls during play.
- Keep interactive targets comfortable for touch; retain visible keyboard focus.
- Respect `prefers-reduced-motion`.
- Preserve readable contrast over both the live 3D scene and the WebGL-unavailable fallback.
- Do not rely on color alone to convey selection, warnings, or status.

### Metadata

Use an accurate title and description that identify the Earth-side extraction premise. Reference the existing preview images rather than inventing new artwork. Social image URLs must resolve correctly from the deployed site; do not substitute a development preview URL or guess the production host.

## Architecture guardrails

- Keep `App.tsx` thin and the mission engine as the owner of gameplay.
- Keep presentation styles in the app stylesheet or focused brand stylesheet, using semantic component hooks rather than fragile substring selectors against generated utility classes.
- Preserve the current menu callbacks, server-match flow, authentication, mission objectives, reward rules, and engine input.
- Do not rename `MarsProfile`, `mte-mars-v1`, `mte-mars-v2`, or other save identifiers as part of visual work.
- Do not claim open-world, multiplayer, cinematic cutscenes, or campaign chapters that are not implemented.
- Reuse the existing social assets unless replacement artwork is explicitly reviewed.

## Verification checklist

Before treating the visual foundation as complete:

1. Run game typecheck, lint, automated tests, and production build.
2. Inspect the menu at desktop and phone widths; check overflow and touch reachability.
3. Verify keyboard focus, reduced-motion behavior, and the WebGL fallback.
4. Confirm operator selection and Start, Server Loot Run, Dossier, Armory, Settings, Saved Inventory, sign-in, and sign-out still work.
5. Confirm no changes reached the engine, combat, rescue, extraction, or progression paths unless separately requested.
6. Verify title, description, Open Graph, and X image references on the actual deployed host before claiming social-preview certification.

## Current implementation and verification — 2026-10-31

The field-command presentation has been applied to the current `main` worktree, without merging PR #2 wholesale or changing gameplay systems.

- The menu now puts the verified rescue, beacon, and recovery objective first; the existing Dossier retains the longer story.
- Existing operator selection and Dossier, Armory, Settings, Saved Inventory, sign-in, and server-run actions use a shared field-command presentation.
- The palette is scoped to the menu so the in-mission HUD keeps its existing colors; danger remains red and ember marks the primary action.
- The WebGL fallback notice no longer overlaps the menu title on a narrow viewport. An unsupported “ACCORD · ACTIVE” label was replaced with the accurate “PRE-DEPLOYMENT” state.
- Stable test IDs were added to the updated menu controls and major information panels.
- Page title, description, Open Graph metadata, and X card metadata now reference the existing preview images. The built output includes `og.jpg` and `x-banner.jpg`.

**Verification:** the MTE typecheck and lint pass; all 167 game tests pass; the production Vite build succeeds with the existing large Three.js chunk advisory. Desktop and 390-pixel phone screenshots show the menu in the WebGL-unavailable fallback. The phone screenshot confirms the warning no longer covers the title; source CSS keeps the menu vertically scrollable and operator roster horizontally scrollable. The capture browser cannot create a WebGL context, so it did not verify the actual 3D backdrop, pointer interaction, keyboard traversal, or physical-device behavior.

**Metadata limitation:** deployment lookup reports no active production deployment. The social asset paths build and resolve as app-root paths, but absolute production URLs and social-crawler previews cannot be verified until the app is published.

**Source-link limitation:** the supplied ChatGPT share was inaccessible to the available page fetch (HTTP 402) and screenshot service (HTTP 429). This implementation is based on the uploaded MTE audit and the separately verified MTE PR #2 only; no unrelated content from the share was assessed.

**Repository state:** local `main` is at `24051f9`; these presentation and reference-document changes remain uncommitted and were not pushed or merged into PR #2.
