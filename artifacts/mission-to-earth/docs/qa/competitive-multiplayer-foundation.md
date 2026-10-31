# Cinder Row competitive multiplayer foundation

## Scope

This adds private Cinder Row rooms and an eight-player ranked queue to the existing Three.js game. Match simulation remains server-owned. Clients send bounded input packets and receive server snapshots over WebSocket; REST remains available for session bootstrap, inventory, recovery, and disconnected-client fallback.

Ranked players are paired by rating proximity, assigned to teams by minimizing the team-rating gap, and receive server-issued player tickets. Match results come from the server's relay-round winner. Rating changes use a database transaction and a unique match-result record to prevent duplicate awards.

## Security and reliability controls

- Competitive match creation and joining require a signed-in account.
- WebSocket upgrades require a same-origin request and a valid Replit session cookie.
- The first frame must prove ownership of the server-issued match token; player IDs and transforms are not accepted as client authority.
- Frames are size-limited, JSON-schema checked, sequence-checked by the match simulation, and constrained by existing server input-rate limits.
- The gateway emits bounded 20 Hz snapshots, heartbeats connections, drops slow consumers, and rehydrates a returning player with the existing token.
- A disconnected real-time player stops contributing to relay capture. Stale socket closes cannot mark a replacement connection disconnected.
- Elo updates are stored in PostgreSQL and deduplicated by match ID. Development schema changes add only the rating and result tables.

## Current limits

This is a competitive multiplayer foundation, not production certification. The live match sessions, ranked queue, and active ranked tickets are still process-local. A server restart loses active rooms and queue entries; multiple API instances do not share simulation state or coordinate matches. Production launch needs a deliberate single-owner/cluster design, reconnect and result recovery across process failure, load and latency testing, operational monitoring, and deployment validation.

The preview browser is not authenticated in automated visual checks, so the signed-in queue-to-match UI has not been certified in a real browser session. Automated API/WebSocket tests cover queue ownership, session tickets, snapshots, reconnect presence, and rating idempotency. Physical-device and regional network tests have not been run.

## Verification record

Baseline commit before these workspace edits: `758a0c2d13b69aeb39a98a0d5c72c1a5fba230be`. Changes are not committed.

- API typecheck: PASS.
- Web typecheck: PASS.
- API tests: PASS, 63/63, including WebSocket ownership/reconnect, ranked queue assignment, and database-backed duplicate-result protection.
- Web game tests: PASS, 168/168.
- API lint: NOT AVAILABLE; the API package has no lint script.
- Web lint: PASS.
- API production build: PASS.
- Web production build: PASS with Vite's warning that the Three.js vendor chunk exceeds 500 kB.
- Development database schema push: PASS; additive rating and match-result tables were applied.
- Live API ranked-status route: unauthenticated request correctly returned HTTP 401.
- Proxied WebSocket route: reached the gateway and correctly rejected an unauthenticated upgrade with HTTP 401.
- Desktop preview: the menu loaded, but the preview browser could not create a WebGL context. 3D gameplay and the signed-in multiplayer UI were therefore NOT TESTED in that browser.
- Mobile browser, physical devices, production deployment, multi-instance behavior, and load/latency targets: NOT TESTED.
