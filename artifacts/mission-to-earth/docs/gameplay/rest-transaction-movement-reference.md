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

## Original uploaded blueprint

The full proposal is retained below so the project reference does not depend on
the attachment being present in a future checkout.

~~~~text
To align with the updated blueprint constraints—acknowledging that this is an ephemeral REST match prototype rather than real-time UDP netcode—we must adapt our data architecture. In a stateless REST environment, the server cannot rely on memory loops. Instead, every execution pass requires a complete Match Transaction Payload containing the versioned match state, input states, and map configurations. The server evaluates this payload, processes the updates, and yields a new versioned snapshot back over HTTP.
The production-hardened REST-adapted components below include a Versioned REST Transaction Schema Wrapper, a Deterministic Voxel Octree Integration, and an Authoritative Engine Matrix.

REST-Adapted Engine Architecture

Place this architecture inside lib/multiplayer/ or a dedicated package folder to handle stateless REST payload validations cleanly.
typescript
import {
  AttachmentSlot,
  MTEWeaponTelemetryEngine,
  ActiveWeaponConfiguration,
  BaseWeaponProfile
} from '../systems/weapons';
import {
  AbilityType,
  PlayerAbilityState,
  MTEAuthoritativeAbilityManager
} from '../systems/abilities';

// ==========================================
// 1. STATELESS REST TRANSPORT PACKETS
// ==========================================

export interface RESTVector3 {
  x: number;
  y: number;
  z: number;
}

export interface RESTPlayerSnapshot {
  id: string;
  factionId: number;
  classId: number;
  position: RESTVector3;
  velocity: RESTVector3;
  rotationYaw: number;
  rotationPitch: number;
  health: number;
  activeWeaponId: number;
  ability: PlayerAbilityState;
}

/**
 * The stateless transaction payload sent over the HTTP POST wire.
 * Contains everything required to compute a single tick-frame transition.
 */
export interface RESTMatchTransactionPayload {
  codecVersion: string; // Enforces protocol version alignment (e.g., "0a2c14f")
  matchId: string;
  sequenceId: number;
  deltaTime: number;
  inputFlags: number;
  movementVector: { strafe: number; forward: number };
  lookDeltas: { yawDelta: number; pitchDelta: number };
  worldState: {
    player: RESTPlayerSnapshot;
    zoneCenter: RESTVector3;
    currentZoneRadius: number;
    targetZoneRadius: number;
  };
}

export interface RESTMatchTransactionResponse {
  matchId: string;
  processedSequenceId: number;
  success: boolean;
  errorCode?: string;
  updatedWorldState: {
    player: RESTPlayerSnapshot;
    currentZoneRadius: number;
    targetZoneRadius: number;
    zonePhase: 'ACTIVE' | 'COLLAPSING' | 'STABLE';
  };
}

// ==========================================
// 2. SPATIAL AABB OCCLUSION GEOMETRY
// ==========================================

export interface RESTAABB {
  min: RESTVector3;
  max: RESTVector3;
}

/**
 * Optimized Axis-Aligned Bounding Box (AABB) collection tracker.
 * Avoids raw arrays or complex heap trees to facilitate immediate, high-speed collision lookups.
 */
export class RESTStaticCollisionGrid {
  private obstacles: RESTAABB[] = [];

  public registerStaticObstacle(min: RESTVector3, max: RESTVector3): void {
    this.obstacles.push({ min, max });
  }

  /**
   * Validates if a target vector position conflicts with registered obstacle structures.
   */
  public isColliding(pos: RESTVector3, radius: number = 0.4): boolean {
    const len = this.obstacles.length;
    for (let i = 0; i < len; i++) {
      const box = this.obstacles[i];
      if (
        pos.x >= box.min.x - radius && pos.x <= box.max.x + radius &&
        pos.y >= box.min.y &&          pos.y <= box.max.y &&
        pos.z >= box.min.z - radius && pos.z <= box.max.z + radius
      ) {
        return true;
      }
    }
    return false;
  }
}

// ==========================================
// 3. SECURE AUTHORITATIVE GAME MATRIX
// =================─────────────────────────

export class MTERESTEngineCore {
  private collisionGrid: RESTStaticCollisionGrid;
  private readonly expectedCodecVersion = '0a2c14f';

  constructor(collisionGrid: RESTStaticCollisionGrid) {
    this.collisionGrid = collisionGrid;
  }

  /**
   * Processes an incoming REST transaction payload.
   * Cleans view deltas, applies acceleration physics, handles ability states, and returns the next match state.
   */
  public processFrameTransaction(payload: RESTMatchTransactionPayload): RESTMatchTransactionResponse {
    // 1. Version Match and Guard Ingestion Validation
    if (payload.codecVersion !== this.expectedCodecVersion) {
      return this.generateErrorResponse(payload, 'CODEC_VERSION_MISMATCH');
    }

    const state = payload.worldState;
    const player = state.player;
    const dt = Math.min(payload.deltaTime, 0.1); // Clamp extreme frames to prevent exploit deltas

    // 2. Authoritative View Delta Processing
    player.rotationYaw = (player.rotationYaw + payload.lookDeltas.yawDelta) % 360;
    player.rotationPitch = Math.max(-89.0, Math.min(89.0, player.rotationPitch + payload.lookDeltas.pitchDelta));

    // 3. Kinematics Vector Calculation Pass
    const isAiming = (payload.inputFlags & (1 << 4)) !== 0; // FOCUS_AIM bit
    const isSliding = (payload.inputFlags & (1 << 6)) !== 0; // SLIDE_DASH bit

    let baseSpeed = isAiming ? 3.0 : 7.0;
    if (isSliding) baseSpeed *= 1.5;

    const radYaw = (player.rotationYaw * Math.PI) / 180;
    const moveX = payload.movementVector.strafe * Math.cos(radYaw) + payload.movementVector.forward * Math.sin(radYaw);
    const moveZ = -payload.movementVector.strafe * Math.sin(radYaw) + payload.movementVector.forward * Math.cos(radYaw);

    const oldPosition = { ...player.position };

    // Apply linear displacement steps
    player.position.x += moveX * baseSpeed * dt;
    player.position.z += moveZ * baseSpeed * dt;

    // Enforce static cover blocking boundary checks
    if (this.collisionGrid.isColliding(player.position)) {
      player.position = oldPosition; // Roll back illegal clipping actions immediately
      player.velocity.x = 0;
      player.velocity.z = 0;
    }

    // 4. Authoritative Ability Timeline Advancements
    const isAbilityTriggered = (payload.inputFlags & (1 << 7)) !== 0; // TRIGGER_ABILITY bit
    if (isAbilityTriggered) {
      MTEAuthoritativeAbilityManager.executeActivationTrigger(player.ability);
    }
    MTEAuthoritativeAbilityManager.advanceAbilityTimeline(player.ability, dt);

    // 5. Ephemeral Battle Royale Safe Zone Transitions
    let zonePhase: 'ACTIVE' | 'COLLAPSING' | 'STABLE' = 'STABLE';
    let currentRadius = state.currentZoneRadius;

    if (currentRadius > state.targetZoneRadius) {
      zonePhase = 'COLLAPSING';
      currentRadius = Math.max(state.targetZoneRadius, currentRadius - 8.5 * dt); // 8.5m collapse steps
    }

    // Process out-of-bounds player radiation penalties
    const dx = player.position.x - state.zoneCenter.x;
    const dz = player.position.z - state.zoneCenter.z;
    const distanceToCenter = Math.sqrt(dx * dx + dz * dz);

    if (distanceToCenter > currentRadius) {
      player.health = Math.max(0, player.health - 6.0 * dt); // Apply 6 HP degradation damage per second
    }

    return {
      matchId: payload.matchId,
      processedSequenceId: payload.sequenceId,
      success: true,
      updatedWorldState: {
        player,
        currentZoneRadius: Number(currentRadius.toFixed(3)),
        targetZoneRadius: state.targetZoneRadius,
        zonePhase
      }
    };
  }

  private generateErrorResponse(payload: RESTMatchTransactionPayload, code: string): RESTMatchTransactionResponse {
    return {
      matchId: payload.matchId,
      processedSequenceId: payload.sequenceId,
      success: false,
      errorCode: code,
      updatedWorldState: {
        player: payload.worldState.player,
        currentZoneRadius: payload.worldState.currentZoneRadius,
        targetZoneRadius: payload.worldState.targetZoneRadius,
        zonePhase: 'STABLE'
      }
    };
  }
}
Use code with caution.

Operational Blueprint Integration

  [Client Local Frame Engine]
               │
               │  1. Compresses Input & State Vectors
               ▼
  [HTTP POST /api/match/frame] ──> [Payload Validation (Codec: 0a2c14f)]
                                                  │
                                                  ▼
                                   [MTERESTEngineCore Processing]
                                                  │
                                                  ▼
  [Client Cache Refreshed Update] <── [HTTP 200 State Response JSON]
Now that the stateless REST transaction engines and boundary verification layers conform strictly to your prototype scope limits:
• Should we design a mock REST client script to simulate testing frame data requests against the server payload parser?
• Do you want to map out the data structures for Dharma or Ma'at server ability updates (such as tracking footprint locations or active portal anchors within the REST transaction loop)?
• Or should we draft unit tests to verify that the server correctly rejects out-of-order sequence frames or invalid codec versions?
~~~~
