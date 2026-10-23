# Authoritative weapon and ability baseline

This reference adapts the attached architecture brief
`Pasted-To-secure-a-comprehensive-architectural-baseline-for-th_1792788229558.txt`.

## Implemented server-side primitives

- The API server has a weapon profile compiler that accepts weapon and
  attachment IDs and resolves them against a trusted catalog supplied by
  server code. It does not accept client-provided damage, RPM, clip size,
  recoil, or attachment modifiers. The current match bootstrap does not yet
  load or use this catalog.
- Attachments are checked for valid IDs, allowed slots, duplicate slots,
  compatibility, modifier bounds, and known perks before their values are
  applied. Profiles are compiled on loadout changes, not in the simulation
  tick.
- Compiled weapon rates have a 30 ms minimum firing interval, magazine sizes
  and damage have explicit upper bounds, and the returned profile is immutable.
- The ability manager creates state from a server-owned registry, checks
  cooldown and active state before activation, and advances durations using
  finite, bounded server deltas.
- Automated tests cover stat stacking, invalid catalog values, forged IDs,
  compatibility, duplicate slots, activation, cooldown, expiry, and long tick
  hitches.

## Compatibility and authority boundaries

The sample's additive weapon modifiers were adapted to Mission To Earth's
existing multiplicative attachment model and its current perk names. The
sample's ability names are retained as reference presets, not mapped directly
to the playable operators: the supplied faction labels and examples do not
match the current roster consistently.

The live match service remains a REST movement-and-loot prototype. These
primitives are not yet wired to authoritative hit resolution, persistent
loadouts, a player-selected hero profile, or binary snapshot replication.
Those require server-owned loadout grants, combat target/hitbox simulation,
and a versioned transport update. Do not describe this layer as production
multiplayer combat or as server-authoritative damage.
