# Phase 0 — Architecture assessment

Source inspected: [niakofa-cmyk/WFM](https://github.com/niakofa-cmyk/WFM) at `4b31352` (2026-10-20) and the current Mission To Earth tree in this workspace.

## What WFM actually is

WFM is a pnpm workspace for a combat-first 5v5 space game with a single-player campaign direction. It is not a ground first-person shooter.

Verified in the tree:

- `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` — OpenAPI, Zod, generated client.
- Express 5 API, PostgreSQL + Drizzle, Orval codegen (see `replit.md`).
- Server-validated progression, market, inventory, world events, and side operations (`docs/verification-step9-step10.md`).
- Product direction in `docs/player-journey-direction.md`: ship selection, readable battles, server-validated rewards, a Mars-centered universe.

WFM verification at that commit reports passing typecheck, build, and automated tests in a development database. It does not certify production account flows or physical-device performance.

## Classification for Mission To Earth

| System | Decision |
|---|---|
| OpenAPI / Zod / Orval patterns | Reusable after adaptation if server-validated progression is added later |
| Server-validated rewards, inventory, world events | Reusable concepts; not required for the local vertical slice |
| Ship physics, space weapons, galaxy navigation | Not appropriate |
| Auth and production account flows | Not required for the local single-player loop |
| Three.js / WebGL client | Already in use in MTE; keep it until measured performance says otherwise |

## Current Mission To Earth slice

The local game already implements a collision-aware first-person controller, weapons with recoil and reload, hitscan damage, enemy line-of-sight, death and restart, and a drop-to-extraction objective. Persistence for extracted pieces is local (`localStorage` Mars stash), not server-validated.

There is no `GameLoopInstanceWorker` and no dedicated multiplayer process. The match runs in the browser.

## Phase 1 gap

Enemy perception was a binary aggro timer. The next verified increment is an explicit mind (`patrol → suspicious → engage → investigate → search`) that does not shoot on a first glimpse and does not treat an unseen target as known.

## Engine decision

Stay on the existing Three.js client. Do not migrate engines on the basis of this assessment. Revisit only after a measured vertical slice on target devices.
