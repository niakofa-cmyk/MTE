# Mission To Earth — narrative and terminology guide

## Core premise

Mission To Earth is an Earth-side science-fiction extraction story. The playable setting is Nod, an occupied district whose neighborhoods, checkpoints, forest edge, and research cradles form one connected region. The game is about freeing people, breaking the occupation's control of the district, and getting out—not about surviving on or extracting from Mars.

## Factions and lineages

- **The Accord:** a decentralized Earth-side resistance network. Its field teams conduct Operation Shakuna and use the beacon to coordinate with cells in Nod.
- **Eon Dusk:** a corporate oligarchy occupying Nod. Its security forces control the district and are using the research cradles to exploit bloodline abilities and Covenant-era technology.
- **Dharma and Ma'at:** two bloodline lineages and traditions represented among the operators. They are not enemy factions. Jaya and Bodhi are Dharma; Khensu and Aset are Ma'at. Ananda and Nefret are the captives held in the cradles.
- **Nod's residents:** people living under the occupation; their resistance is a local consequence of the rescue.

## Conflict and timeline

1. **Three centuries of containment:** the Accord guarded Covenant-era technology and kept it from becoming an instrument of control.
2. **The occupation:** Eon Dusk took Nod, imprisoned Ananda and Nefret, and began draining their abilities in Cradle Alpha and Cradle Omega.
3. **Present — Operation Shakuna:** the player enters Nod, frees both captives, raises the Accord beacon, and reaches the recovery pad before the lockdown closes.
4. **After the extraction:** the beacon gives Nod's resistance a chance to coordinate. Future missions can build on that local outcome without requiring a larger map.

Recovering Eon Dusk's blueprints can expose a planned invasion of Mars. Treat this as a later campaign threat revealed by the player's extraction, while keeping the current playable setting and mission centered on Earth and Nod.

Mars may exist in the wider setting as an off-world destination, but it is not the player's home base, the source of the current mission, or the identity of the playable loop.

## Canonical place and mission names

- **Operation Shakuna:** the playable mission.
- **Nod:** the occupied Earth-side district.
- **Cinder Row:** the central settlement and local resistance point.
- **Red Veil Compound:** Eon Dusk's hostile compound.
- **Western Greenline:** the forest-edge route through the region.
- **North Checkpoint:** the Eon Dusk military checkpoint.
- **Cradle Alpha / Cradle Omega:** the research sites holding Ananda and Nefret.
- **Accord Signal Facility:** the beacon objective.
- **Recovery pad:** the extraction objective.

## Player-facing terminology

Use **Accord field cache**, **salvage credits**, **filed mods**, **Nod field log**, and **Eon Dusk security** in the UI and mission chatter. Describe Dharma and Ma'at operators as lineages. Use **ceramic plate** for the armor pickup.

Keep existing weapon names as proper names: KARMA-9, VEIL RIFLE, MANDALA 12, STONE DRUM, HORIZON RAIL, SIDEARM, NULL PAIR, and RA SLUG.

## Save-data compatibility

Player-facing text can change independently of internal progression identifiers. Keep the existing `MarsProfile` model and `mte-mars-v1`/`mte-mars-v2` storage keys readable until a deliberate, tested save migration is needed. Do not rename internal fields only to remove old wording.
