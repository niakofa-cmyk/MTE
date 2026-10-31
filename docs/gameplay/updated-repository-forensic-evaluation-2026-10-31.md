# Mission To Earth — Updated Repository Forensic Evaluation

**Review date:** 2026-10-31  
**Repository:** `niakofa-cmyk/MTE`  
**Reviewed main commit:** `3b54fe7370b10744fbe81bf6b82396951d6c50b4`  
**Source:** user-provided report, `Pasted-Worked-for-44s-MISSION-TO-EARTH-Updated-Repository-Fore_1793440859358.txt`

This is the durable, repository-checked reference for the supplied forensic
report. The full attachment is stored in the workspace's ignored
`attached_assets/` directory; this tracked document records the findings that
should guide implementation.

## External-link check

The three previously supplied ChatGPT MTE audit shares were retried on
2026-10-31, including the latest link sent with this report. The fetch service
returned HTTP 402 for each. No facts from those share pages are treated as
verified. This reference is based on the supplied report and the MTE source
tree.

## Executive direction

Start designing and prototyping one multiplayer arena, but do not make multiple
production maps the next milestone. Use a compact vertical slice to expose and
complete missing server, objective, and match-lifecycle work. Keep the existing
solo rescue campaign as the stable baseline. A configured player limit, an
isolated simulation test, or a green CI run is not multiplayer certification.

Recommended first arena: **Cinder Row: Blackout**, a compact 4v4 objective
prototype around an Accord relay. The map and round should be server-owned.
Treat 4v4 as a test target, not a measured capacity claim.

## Current implementation status

| Capability | Verified status |
| --- | --- |
| Nod solo FPS and mission foundation | Implemented; retain as the baseline |
| Visual identity | First-stage field-command treatment merged; original key art and full-screen art direction remain incomplete |
| Server-owned match simulation | Implemented and unit/API-tested |
| Server match API and browser client | Integrated through REST polling in the Server Loot Run path |
| Movement, weapon cadence, hit validation, and cover checks | Server-side foundations and tests exist |
| Loot, terminals, temporary match inventory | Server-owned interactions and duplicate-claim checks exist |
| Authenticated persistent extraction rewards | Receipt and profile settlement exist; retry is idempotent |
| Map data | Generated, validated Nod geometry and gameplay manifest; bootstrap remains Nod-specific |
| Rescue/beacon objective progression on server | Incomplete; objective records wait for server events, and routes do not advance the chain |
| Teams, competitive rounds, relay capture, and winner settlement | Not implemented as a complete game mode |
| Realtime transport | Not implemented; the client polls over HTTP |
| Prediction, reconciliation, remote interpolation | Not implemented as a complete client network loop |
| Live-session recovery after API restart | Not implemented; unfinished sessions remain in memory |
| Multi-client latency, packet-loss, load, and physical-device certification | Not tested |

The browser client sends input every 50 ms (20 Hz), requests snapshots every
200 ms (5 Hz), and polls gameplay/extraction state every 1,500 ms. The server
uses a bounded 60 Hz simulation loop. These cadences support a prototype, but
they do not establish responsive competitive play.

The API exposes match creation and join, input, snapshots, world-state, loot
claims, terminal interactions, extraction status/settlement, and account
profile routes. See
[`authoritative-match-session-api.md`](./authoritative-match-session-api.md)
for the current route and lifecycle contract.

## First arena design target

Build three connected but readable routes around the relay:

- **Ashway:** exposed, longer sightlines and a fast but dangerous route.
- **Transit Spine:** medium-range central route with multiple entrances and
  defensible interior cover.
- **Service Undercroft:** close-range flanking route with limited sightlines.

The first mode should be short, replayable objective rounds between the Accord
resistance and Eon Dusk security. Avoid destructible buildings and dynamic
city-scale events until collision, objectives, and the ordinary round loop are
reliable.

## Implementation order and gates

1. Preserve and verify the solo rescue-to-extraction loop; keep its status
   separate from the multiplayer prototype.
2. Keep architecture documentation aligned with the routes and code. Distinguish
   implemented/tested, integrated, prototype-only, and planned systems.
3. Define a versioned, server-approved map/match contract: geometry, spawns,
   teams, objectives, interaction zones, map bounds, mode rules, and asset IDs.
   The client may request an approved map ID, but it must not provide trusted
   geometry or authoritative spawn coordinates.
4. Graybox Cinder Row and validate shared server/client geometry, safe spawns,
   collision boundaries, three approaches, and the relay's interaction range.
5. Implement server-owned teams, relay progress, round timing, victory, and
   result settlement before adding more maps.
6. Add a bounded realtime transport, then prediction/reconciliation for the
   local player and interpolation for remote players.
7. Test multiple clients under latency and packet loss, disconnect/reconnect,
   forged inputs, spawn fairness, and measured server resource load.

Do not call the arena ready until map correctness, collision, spawn safety,
match lifecycle, combat authority, objective authority, networking, security,
performance, mobile usability, and repeated-match play have evidence.

## Review limits

The report's broad recommendation is accepted as a staged direction, not as
evidence that the arena or campaign systems already exist. The 64-player
configuration is not a certification. Desktop/phone screenshots that use the
WebGL fallback do not verify real 3D gameplay or physical devices.
