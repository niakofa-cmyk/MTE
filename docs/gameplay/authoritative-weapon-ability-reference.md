# Authoritative weapon and ability baseline

This reference adapts the attached architecture brief
`Pasted-To-secure-a-comprehensive-architectural-baseline-for-th_1792788229558.txt`.

## Implemented match authority

- Match joins accept one allowlisted operator ID. The server chooses both
  weapons and the ability from its roster; the client cannot submit weapon
  stats, ammo, damage, or ability parameters. Attachments are not yet loaded
  into multiplayer loadouts.
- The API server compiles base weapon profiles from a trusted catalog. Match
  ticks own magazine and reserve ammo, per-hand fire cadence, reload timers,
  dry clicks, and separate left/right fire actions. A normal reload selects
  the hand that needs ammo and staggers two reloads; a quick second reload
  request starts both with a duration penalty.
- Each shot is ray-tested from server-owned position and look angles against
  other live match players. The nearest valid target receives range-falloff
  damage only when the static collision map does not block the shot. The
  server does not accept a client-supplied target or damage amount.
- Attachments are checked for valid IDs, allowed slots, duplicate slots,
  compatibility, modifier bounds, and known perks before their values are
  applied by the standalone compiler. Profiles are compiled outside the
  simulation tick.
- Compiled weapon rates have a 30 ms minimum firing interval, magazine sizes
  and damage have explicit upper bounds, and the returned profile is immutable.
- The ability manager creates state from a server-owned registry, checks
  cooldown and active state before activation, and advances durations using
  finite, bounded server deltas. The six playable operator abilities now use
  server-owned cooldowns and effects: phase protection, a two-point gateway
  teleport, thermite area damage, gradual healing, a forward shift, and a
  directional shatter pulse.
- REST snapshots carry protocol version 3 and include operator, weapon IDs,
  magazine/reserve ammo, reload state, and ability timers for every match
  player. The separate compact binary codec is also version 3 and validates
  identifiers, flags, ranges, truncation, and reserved bits. The client
  renders other players as simple silhouettes whose weapon and ability
  indicators follow those snapshots.
- Automated tests cover stat stacking, invalid catalog values, forged IDs,
  compatibility, duplicate slots, server hit and cover checks, firing cadence,
  independent reloads, ability edges, operator join selection, snapshot
  round-trips, malformed packets, and long tick hitches.

## Remaining limits

The sample's additive weapon modifiers were adapted to Mission To Earth's
existing multiplicative attachment model and its current perk names. The
sample's ability names are retained as reference presets, not mapped directly
to the playable operators.

This is still a bounded REST polling prototype, not production multiplayer.
It has no authenticated durable identity, team rules, respawn/round lifecycle,
server-owned attachments, hit zones, structural destruction, or persistent
inventory. Multiplayer abilities do not reproduce every local NPC/world
effect, and the solo campaign's NPC combat and extraction progression remain
client-side. The v3 binary codec is not currently the REST transport. Do not
describe these limits as solved or claim production-ready netcode.
