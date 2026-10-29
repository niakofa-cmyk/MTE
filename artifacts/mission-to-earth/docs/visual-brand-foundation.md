# Mission To Earth — Forensic Visual Foundation & Redesign

**Review baseline:** `main` at `340c0dfe1c0967b1227856d6c2d914f3e1a372ab` (24 October 2026).  
**Scope:** source-level inspection of the React entry, `Mission.tsx`, `styles.css`, `index.html`, narrative guide, existing social assets, and current open Alpha gate fix. This is not a live-browser or production certification.

## Executive assessment

MTE already has the right raw ingredients for a distinctive tactical science-fiction identity: a Three.js first-person mission, the occupied Earth district of Nod, the Accord resistance, Eon Dusk security, Dharma and Ma'at lineages, the rescue of Ananda and Nefret, the beacon, and a timed extraction. The current opening is a functional in-game command menu rendered over the live scene, not a separate marketing landing page. It uses a large “Mission to Earth” headline, one explanatory paragraph, operator cards, and utility actions.

The implementation foundation is better than the first impression suggests: the React shell is deliberately thin (`App.tsx` returns `Mission`), the game screen state lives in `Mission.tsx`, the world is rendered by a dedicated engine, and the stylesheet already has accessible reduced-motion handling for some HUD effects. The opportunity is to make the presentation as intentional as the underlying world without rewriting game systems.

## Forensic findings

### What is already working

- **Clear opening action:** the menu offers Start, Server Loot Run, Dossier, Armory, and Settings.
- **Faction/character selection:** operator cards surface roles, passives, active skills, and ultimate abilities; the selection already distinguishes cyan and gold tones.
- **Readable core palette:** the existing ink/surface/paper palette provides a strong foundation for a dark tactical interface.
- **Story identity exists:** `NARRATIVE.md` establishes Nod, Cinder Row, Red Veil Compound, Western Greenline, North Checkpoint, Cradle Alpha/Omega, the Accord Signal Facility, and the recovery pad.
- **Social art exists:** `public/og.jpg`, `public/x-banner.jpg`, and `public/favicon.svg` are already present.
- **Gameplay and presentation can be separated:** the menu is a React overlay, while `MissionEngine` handles gameplay. That allows controlled visual work without touching aim, combat, enemy AI, mission objectives, or extraction logic.

### Main visual gaps

1. **The title is generic compared with the setting.** “Mission to Earth” has no clear graphic lockup, chapter/operation label, or recurring insignia.
2. **The menu reads as a developer HUD before it reads as a premium game.** The dark overlay and Tailwind utility styling work, but the hierarchy is mostly one heading, one paragraph, then cards.
3. **The visual language lacks a consistent campaign frame.** There is no strong recurring system of sector labels, briefing metadata, target markers, corner framing, and signal/field typography tying the title, dossier, armory, and settings together.
4. **The menu copy is long and lore-dense at first contact.** The rescue objective should land in one memorable sentence; deeper lore belongs in the Dossier.
5. **Palette semantics are not fully codified.** Cyan and gold currently communicate operator variants, while the story also needs clear, repeatable meanings for resistance signal, hostile threat, salvage, and bloodline/legacy.
6. **Social metadata is serviceable but minimal.** The page title and descriptions can more clearly communicate the playable premise and use the existing preview art.
7. **The game and campaign should remain the source of truth.** A visual redesign must not imply a completed open world, large-scale multiplayer, or unimplemented campaign chapters.

## Brand direction: “NOD FIELD COMMAND”

MTE should feel like a **field dossier recovered from an occupied district**—part cinematic extraction thriller, part improvised resistance command system. It should not look like a generic neon space game, and it should not borrow WFM's space-combat identity.

### Brand principles

- **Earth-first, not Mars-first:** current play is on Earth in Nod. Mars is a wider-campaign revelation, not the current location or gameplay identity.
- **Resistance is tactile:** weathered surfaces, smoky depth, hard-edged typography, signal marks, paper/ceramic material cues, and restrained warm light.
- **The UI has a diegetic purpose:** labels resemble operation briefings, comms, sector maps, salvage records, and target dossiers.
- **Keep cinematic art behind functional UI:** text and controls must remain legible over the 3D scene.
- **No fake functionality:** visual panels must correspond to actual game data and actions.

### Proposed visual tokens

| Token | Value | Meaning |
|---|---|---|
| Ink | `#080B0D` | deep field darkness |
| Panel | `rgba(14,20,22,.88)` | smoked-glass command surfaces |
| Paper | `#E8E5D9` | high-priority text |
| Ash | `#A0A59D` | secondary information |
| Ember | `#E56B45` | immediate action / extraction urgency |
| Ember hot | `#FF8A58` | primary CTA and high-energy edge |
| Signal | `#7AD9C5` | Accord comms / friendly system state |
| Brass | `#D6B36A` | legacy, salvage, mission reward |
| Stroke | `rgba(193,206,195,.2)` | fine separators and panels |

Use ember for the main **Start** action, signal for friendly system information, brass for lineage and rewards, and red only for danger/damage. Avoid assigning all colors to arbitrary decoration.

### Typography and layout

- Keep Rajdhani for display/HUD headings and Barlow for reading copy.
- Use short uppercase operational labels with generous tracking; keep story paragraphs in normal case.
- Use one dominant title, one concise mission objective, one primary action, and a secondary row of utility actions.
- Use asymmetrical composition and a fine map-grid texture sparingly. The grid must not obscure the 3D backdrop or text.
- At phone widths, stack controls, allow horizontal operator-card browsing, keep touch targets comfortable, and avoid fixed content that overlaps gameplay controls.

## Recommended page architecture

1. **Opening / field command:** “MISSION TO EARTH” + “OPERATION SHAKUNA / NOD SECTOR 07”; one-line objective: “Free Ananda and Nefret. Recover the intelligence. Reach the extraction pad.” Primary Start; secondary Server Loot Run; Dossier, Armory, Settings remain discoverable.
2. **Operator selection:** clear Dharma/Ma’at lineage labels, role and ability hierarchy, selected-state border and readable card states. Captive lineage cards should be visually distinct from playable operators.
3. **Dossier:** briefing objective, known hostile, rescue target, route risk, extraction condition, and campaign context—only where each item exists in the content model.
4. **Armory and settings:** use the same panel, label, divider, focus, and motion rules. Do not duplicate their game logic.
5. **In-mission HUD:** evolve separately after menu regression. Preserve current hit markers, damage direction, extraction feedback, minimap, touch overlay, and reduced-motion behavior.

## Architecture and implementation guardrails

- Keep `App.tsx` thin; keep the engine and game state in the existing game modules.
- Use CSS tokens and a dedicated brand stylesheet rather than scattering new colors through gameplay code.
- Presentation-only state may control menus and transitions; mission state, objective completion, rewards, and save persistence remain owned by the existing engine/progression code.
- Do not rename `MarsProfile`, `mte-mars-v1`, or `mte-mars-v2` storage identifiers as part of a visual pass; compatibility is explicitly documented in `NARRATIVE.md`.
- Do not replace or bypass the Alpha gate, rescue, beacon, extraction, server-match, or loot flows for the sake of a cinematic transition.
- Reuse the existing `og.jpg`, `x-banner.jpg`, and favicon until new art is reviewed and ready.
- Add a real browser screenshot/playtest pass after build/typecheck/lint/test; source review alone cannot certify the live look or WebGL behavior.

## Implementation in this branch

- Added a dedicated `brand-system.css` stylesheet with MTE-specific tokens, restrained field-grid framing, a clearer opening hierarchy, action states, operator-card styling, responsive adjustments, focus-visible treatment, and reduced-motion support.
- Added explicit CSS hooks to the existing menu root, layout, title, primary action, and operator cards. The game flow and engine calls remain unchanged.
- Updated document/social metadata to emphasize the Earth-side extraction premise and reference the repository's existing OG and X banner images.
- No new game modes, objectives, server behavior, save identifiers, or progression behavior were added.

## Verification still required before merge/release

- `pnpm --filter @workspace/mission-to-earth typecheck`
- `pnpm --filter @workspace/mission-to-earth lint`
- `pnpm --filter @workspace/mission-to-earth test`
- `pnpm --filter @workspace/mission-to-earth build`
- Browser checks at desktop and phone widths, including keyboard focus, operator selection, Dossier/Armory/Settings navigation, Start, Server Loot Run, WebGL fallback, reduced-motion preference, and the complete rescue-to-extraction path.
- Confirm production route/base path and OG image URLs on the actual host before declaring the presentation certified.
