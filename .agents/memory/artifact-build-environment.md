---
name: Artifact production builds
description: Build and verify workspace artifacts when their Vite configs require per-artifact environment.
---

The workspace-wide `pnpm run build` can run artifact Vite configs without the managed workflow's per-artifact `PORT` and `BASE_PATH`. Setting `PORT` alone may expose the missing `BASE_PATH`; assigning one global base path to every artifact can build them with incorrect routing. For the artifact changed in the task, use its actual route base and an explicit `PORT` for a focused production build. Report workspace-wide build failures separately rather than claiming the focused artifact build certifies every workspace artifact.

**Why:** On 2026-10-31, the root build stopped in the unrelated mockup-sandbox because `PORT` and then `BASE_PATH` were absent; the Mission To Earth artifact built successfully with `PORT=5173` and `BASE_PATH=/`.

**How to apply:** When a root build fails at another artifact's Vite config, inspect the artifact's managed route and build the changed artifact with its own environment. Do not modify artifact manifests just to bypass a local build-environment mismatch.
