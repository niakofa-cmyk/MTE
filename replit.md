# Mission To Earth

Mission To Earth is a single-player 3D extraction shooter set in Nod, with tactical combat, rescue objectives, equipment progression, and local saves.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Game UI and mission flow: `artifacts/mission-to-earth/src/game/Mission.tsx`
- 3D game loop and combat systems: `artifacts/mission-to-earth/src/game/engine.ts`
- City layout and world data: `artifacts/mission-to-earth/src/game/world.ts`
- Full game-design reference: `artifacts/mission-to-earth/docs/mission-design-master-prompt.md`

Use the saved design prompt as staged guidance. Keep changes playable and testable; do not describe future open-world or campaign goals as implemented features.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

Players choose an operator, prepare equipment, enter a 3D mission, rescue two bloodlines, and extract. Personal records and equipment progression are stored locally in the browser.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Read `artifacts/mission-to-earth/docs/mission-design-master-prompt.md` before making substantial game-design or gameplay changes
