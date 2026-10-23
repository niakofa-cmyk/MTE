# REST Match Transactions and Movement — Project Reference

This document adapts the user-provided “REST-adapted engine architecture”
blueprint to Mission To Earth's existing game and API. The attached proposal is
a design sketch, not production-ready code. Its useful direction is to keep
movement inputs bounded, simulation state authoritative, collision geometry
server-owned, and protocol versions explicit.

## Use the existing match architecture

The game already has a bounded HTTP match-session wrapper around an
authoritative simulation. It is an ephemeral, in-memory REST prototype—not a
stateless simulation service and not real-time UDP networking.

- Clients submit sequenced movement/look/action input to the existing match
  input route. They do not submit a complete player snapshot, position, speed,
  delta time, or map/zone configuration.
- The server resolves player identity from the temporary session token, checks
  sequence and input bounds, and advances state using server-measured time.
- The server clamps tick duration, owns match state and static level collision,
  and returns versioned snapshots. The current snapshot protocol is version 3.
- Do not add a parallel `/api/match/frame` path or move solo mission movement
  into the match server as part of this proposal.

The sample's single REST transaction payload includes client-provided world
state, health, ability state, zone radii, and delta time. Do not copy that trust
model into the project. A client-provided complete state cannot make server
simulation authoritative.

## Movement and collision contract

Movement vectors are bounded and normalized before use. The server derives
world-space motion from its own yaw and configured speed:

```text
moveX = strafe * cos(yaw) + forward * sin(yaw)
moveZ = -strafe * sin(yaw) + forward * cos(yaw)
```

Static level geometry is loaded from a validated, size-bounded asset before
players can join. The collision map uses bounded AABBs and axis-separated
swept horizontal movement so a blocked axis can slide along a clear axis.
Spawns and teleport destinations must be clear of static geometry.

Movement also recovers from an already-overlapping initial position by moving
the player to the nearest clear face of an intersecting AABB before applying
the next input. This is a defensive recovery for reconciliation or future spawn
changes; normal movement must not enter solid geometry.

## Blueprint topics and how they map

| Blueprint topic | Project decision |
| --- | --- |
| Versioned requests and responses | Keep explicit protocol versions and monotonic per-player input sequences. Do not use a source-control hash as a protocol version. |
| Bounded frame delta | Use server-measured time and the existing server-side tick clamp; do not accept client `deltaTime`. |
| Movement vectors and look deltas | Accept bounded inputs; derive positions, movement speed, and rotation limits on the server. |
| Static AABB collision | Use the existing validated collision map and level asset loader; keep level geometry server-owned. |
| Ability timelines | Advance only abilities represented by the existing server-owned match model. Do not accept client ability objects. |
| Shrinking-zone calculations | Keep the existing match-zone model; do not accept client zone centers or radii. |
| “Stateless” transaction processing | Not the current deployment model: sessions and simulation state are temporary server memory. Document and test that limit rather than imply durable or stateless operation. |

## Verification expectations

- A valid forward or strafe input changes the server snapshot position.
- Diagonal input is normalized and cannot exceed configured movement speed.
- A wall blocks motion through its AABB while allowing movement along an
  unblocked axis.
- A player recovered from an embedded starting position is clear of the
  collider and can continue moving.
- Invalid, stale, or out-of-range input is rejected without trusting
  client-supplied state.

## Source

Adapted from
`attached_assets/Pasted-To-align-with-the-updated-blueprint-constraints-acknowl_1792792129087.txt`.
That proposal's code is retained as inspiration only; follow this project's
server-authority, validation, and bounded-collision rules when implementing
future changes.
