# Extraction and mobile HUD references

The attached briefs are preserved verbatim in this directory:

- `extraction-encounter-blueprint-source.txt`
- `mobile-extraction-hud-countdown-source.txt`

## How the briefs are applied

The mobile HUD brief's useful goals—countdown visibility, hold-boundary alerts, and hostile-wave awareness—are implemented using the current mission engine's real state. The game currently uses a 4.6-second beacon channel and a 6-second recovery lock, not the brief's proposed 45-second server survival phase. The overlay reports those live durations, the actual beacon/pad boundaries, and active hostile counts.

The broader server/WAL examples remain design references, not code to paste into the current solo mission. The solo extraction and rewards are browser-local today; the authenticated match-session API is a separate, bounded prototype and does not own solo extraction. The sample endpoint accepts client-supplied world state, hard-codes beacon coordinates, uses a mock in-memory match map, and does not establish trusted server authority. The disconnect sample also contains an incomplete object literal (`extractedWeaponIds:`). None of those samples are used to grant rewards or write persistence.

Do not add the proposed 45-second hold or more hostile waves as a side effect of presenting the HUD. The existing beacon counter-push has not yet been verified as survivable in a clean extraction run; tune encounter difficulty only after that run is completed and measured.
