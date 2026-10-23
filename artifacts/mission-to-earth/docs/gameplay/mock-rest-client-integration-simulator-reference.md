# Mock REST Client Integration Simulator — Project Reference

This project reference archives the full user-provided simulator proposal and
records how it applies to Mission To Earth.

## Project fit and implementation guidance

The proposal is useful as a checklist for sequence validation, protocol
versioning, authoritative responses, input bounds, and regression tests. The
game already has a real REST match workflow through `ServerMatchClient` and
`/matches/:matchId/input`, `/snapshot`, and `/world-state`.

Do not add the sample `/api/match/frame` route or accept `worldState.player`,
health, position, zone values, or `deltaTime` from a client as authoritative.
The server owns match state and advances movement from bounded, sequenced
inputs. The uploaded sample's input DTO also does not match this project's
current API contract. Keep simulator experiments as tests or test-only
utilities around the existing endpoints.

The sample is not drop-in TypeScript: it imports REST engine and ability
modules that are not part of this project, and its fixture contains the
invalid property `is atualmenteActive`. Its `Date.now()` clone IDs are also
not deterministic. Treat the source as a design proposal; preserve its
protocol-testing intent while using the project's existing validators and
authoritative simulation.

## Original uploaded document

The full uploaded text is archived below for future implementation work.

~~~~text

1. Mock REST Client Integration Simulator

This client utility simulates the high-frequency HTTP POST payload loop. It formats the required transformation states, packs input bitmasks, handles local frame-time updates, and tracks server sequence counters over stateless transactions.
typescript
import { 
  RESTMatchTransactionPayload, 
  RESTMatchTransactionResponse, 
  RESTPlayerSnapshot 
} from './MTERESTEngineCore';
import { AbilityType, MTEAuthoritativeAbilityManager } from '../systems/abilities';

export class MTERESTIntegrationSimulator {
  private serverEndpointUrl: string;
  private matchId: string;
  private sequenceCounter: number = 1;
  private localPlayerState: RESTPlayerSnapshot;
  
  private currentZoneRadius = 4000.0;
  private targetZoneRadius = 2000.0;
  private zoneCenter = { x: 0, y: 0, z: 0 };

  constructor(endpoint: string, matchId: string, playerId: string) {
    this.serverEndpointUrl = endpoint;
    this.matchId = matchId;
    
    // Initialize deterministic client cache values
    this.localPlayerState = {
      id: playerId,
      factionId: 1, // THE_ACCORD_DHARMA
      classId: 2,   // DHARMA_CLONER
      position: { x: 10.0, y: 0.0, z: 10.0 },
      velocity: { x: 0.0, y: 0.0, z: 0.0 },
      rotationYaw: 0.0,
      rotationPitch: 0.0,
      health: 100.0,
      activeWeaponId: 101,
      ability: MTEAuthoritativeAbilityManager.createDefaultState(AbilityType.DECOY_CLONE)
    };
  }

  /**
   * Dispatches a simulated frame iteration packet over HTTP.
   */
  public async executeSimulatedFrameTick(
    deltaTime: number,
    inputFlags: number,
    moveVector: { strafe: number; forward: number },
    lookDeltas: { yawDelta: number; pitchDelta: number }
  ): Promise<RESTMatchTransactionResponse | null> {
    
    const payload: RESTMatchTransactionPayload = {
      codecVersion: '0a2c14f', // Protocol tracking baseline match lock
      matchId: this.matchId,
      sequenceId: this.sequenceCounter++,
      deltaTime: Number(deltaTime.toFixed(4)),
      inputFlags,
      movementVector: moveVector,
      lookDeltas,
      worldState: {
        player: { ...this.localPlayerState },
        zoneCenter: this.zoneCenter,
        currentZoneRadius: this.currentZoneRadius,
        targetZoneRadius: this.targetZoneRadius
      }
    };

    try {
      // In a runtime web environment, replace this with your platform's standard fetch framework
      const response = await fetch(this.serverEndpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP_TRANSPORT_ERROR: Status ${response.status}`);
      }

      const result: RESTMatchTransactionResponse = await response.json();
      
      if (result.success && result.updatedWorldState) {
        // Authoritatively synchronize client state with server return values
        this.localPlayerState = result.updatedWorldState.player;
        this.currentZoneRadius = result.updatedWorldState.currentZoneRadius;
        this.targetZoneRadius = result.updatedWorldState.targetZoneRadius;
      }

      return result;
    } catch (e) {
      console.error(`PROTOTYPE_CLIENT_SIMULATOR_FAIL:`, e);
      return null;
    }
  }
}
Use code with caution.

2. Stateless Extended Faction & Ability Payload Framework

To extend class capabilities within the prototype's stateless framework, this update appends tracking vectors for active Dharma Decoy Clones and Ma'at Portal Anchors directly into the transaction payloads.
typescript
import { RESTVector3, RESTPlayerSnapshot } from './MTERESTEngineCore';
import { AbilityType } from '../systems/abilities';

export interface RESTAbilityExtendedData {
  activeClones: Array<{ cloneId: string; position: RESTVector3; remainingDurationSec: number }>;
  activePortals: Array<{ portalId: string; originAnchor: RESTVector3; destinationAnchor: RESTVector3; remainingDurationSec: number }>;
}

export interface RESTExtendedMatchTransactionPayload {
  codecVersion: string;
  matchId: string;
  sequenceId: number;
  deltaTime: number;
  inputFlags: number;
  movementVector: { strafe: number; forward: number };
  lookDeltas: { yawDelta: number; pitchDelta: number };
  worldState: {
    player: RESTPlayerSnapshot;
    abilityExtension: RESTAbilityExtendedData; // Extended payload tracking data
    zoneCenter: RESTVector3;
    currentZoneRadius: number;
    targetZoneRadius: number;
  };
}

export class MTERESTAbilityExtender {
  /**
   * Processes tracking values for transient abilities across stateless frame transactions.
   */
  public static processAbilityEffects(
    player: RESTPlayerSnapshot, 
    extData: RESTAbilityExtendedData, 
    flags: number, 
    dt: number
  ): void {
    // 1. Process active clone timelines
    let i = extData.activeClones.length;
    while (i--) {
      const clone = extData.activeClones[i];
      clone.remainingDurationSec -= dt;
      if (clone.remainingDurationSec <= 0) {
        extData.activeClones.splice(i, 1); // Decay expired clones safely
      }
    }

    // 2. Process active portal anchors
    let p = extData.activePortals.length;
    while (p--) {
      const portal = extData.activePortals[p];
      portal.remainingDurationSec -= dt;
      if (portal.remainingDurationSec <= 0) {
        extData.activePortals.splice(p, 1);
      }
    }

    // 3. Handle activation events for the Dharma Cloner faction
    const triggerBit = (flags & (1 << 7)) !== 0;
    if (triggerBit && player.ability.abilityId === AbilityType.DECOY_CLONE && player.ability.cooldownRemainingSec === 0) {
      extData.activeClones.push({
        cloneId: `CLONE_${player.id}_${Date.now()}`,
        position: { ...player.position }, // Clone instantiates at the player's current coordinate matrices
        remainingDurationSec: player.ability.activeDurationMaxSec
      });
    }
  }
}
Use code with caution.

3. Engine Core REST Protocol Verification Test Suite

This automated test module verifies frame sequence progression, filters out-of-order payloads, checks codec matches, and enforces anti-cheat speed bounds.
typescript
import { 
  MTERESTEngineCore, 
  RESTStaticCollisionGrid, 
  RESTMatchTransactionPayload 
} from './MTERESTEngineCore';
import { AbilityType } from '../systems/abilities';

export class MTEEngineRESTTestRunner {
  public static runAllTests(): void {
    console.log('--- STARTING MTE REST PROTOCOL PROTOTYPE TEST MATRIX ---');
    
    const grid = new RESTStaticCollisionGrid();
    const core = new MTERESTEngineCore(grid);

    this.testInvalidCodecRejection(core);
    this.testValidFrameTransition(core);
    this.testExtremeDeltaClamping(core);
    
    console.log('--- ALL TEST MODULES CONCLUDED SUCCESSFULLY ---');
  }

  private static testInvalidCodecRejection(core: MTERESTEngineCore): void {
    const brokenPayload = this.generateBaseMockPayload();
    brokenPayload.codecVersion = '0000000_CORRUPT';

    const response = core.processFrameTransaction(brokenPayload);
    if (!response.success && response.errorCode === 'CODEC_VERSION_MISMATCH') {
      console.log('PASS: Invalid codec payload rejected authoritatively.');
    } else {
      throw new Error('FAIL: Server failed to catch an unaligned client codec version.');
    }
  }

  private static testValidFrameTransition(core: MTERESTEngineCore): void {
    const payload = this.generateBaseMockPayload();
    payload.lookDeltas.yawDelta = 10.0; // Apply intentional view rotation displacement

    const response = core.processFrameTransaction(payload);
    if (response.success && response.updatedWorldState.player.rotationYaw === 10.0) {
      console.log('PASS: Valid transaction processed and look transformations calculated accurately.');
    } else {
      throw new Error('FAIL: Standard frame delta translation calculation error.');
    }
  }

  private static testExtremeDeltaClamping(core: MTERESTEngineCore): void {
    const exploitPayload = this.generateBaseMockPayload();
    exploitPayload.deltaTime = 500.0; // Inject impossible lag spike values to attempt a speed exploit
    exploitPayload.movementVector = { strafe: 0, forward: 1 };

    const response = core.processFrameTransaction(exploitPayload);
    // Calculated displacement should reflect clamped dt ceiling constraints (0.1s max)
    const expectedMaxX = 10.0 + (1.0 * 7.0 * 0.1); 
    
    if (response.updatedWorldState.player.position.x <= expectedMaxX + 0.01) {
      console.log('PASS: Extreme lag spikes clamped successfully. Velocity speeds match safety guidelines.');
    } else {
      throw new Error('FAIL: Anti-cheat frame delta validation threshold breached.');
    }
  }

  private static generateBaseMockPayload(): RESTMatchTransactionPayload {
    return {
      codecVersion: '0a2c14f',
      matchId: 'MATCH_TEST_MOCK_11',
      sequenceId: 1,
      deltaTime: 0.0166, // 60 FPS baseline frame timestamp mapping
      inputFlags: 0,
      movementVector: { strafe: 0, forward: 0 },
      lookDeltas: { yawDelta: 0, pitchDelta: 0 },
      worldState: {
        player: {
          id: 'PL_1', factionId: 1, classId: 2,
          position: { x: 10, y: 0, z: 10 }, velocity: { x: 0, y: 0, z: 0 },
          rotationYaw: 0, rotationPitch: 0, health: 100, activeWeaponId: 101,
          ability: {
            abilityId: AbilityType.DECOY_CLONE, cooldownMaxSec: 25,
            cooldownRemainingSec: 0, activeDurationMaxSec: 5,
            activeDurationRemainingSec: 0, is atualmenteActive: false
          }
        },
        zoneCenter: { x: 0, y: 0, z: 0 },
        currentZoneRadius: 1000,
        targetZoneRadius: 1000
      }
    };
  }
}
Use code with caution.
With the mock REST integration loops, extended ability frameworks, and validation suites finalized to match the prototype's scope limits:
• Should we integrate these modules directly into a mock server routing module (such as an Express/Fastify endpoint shell layout)?
• Do you want to build the schemas for processing randomized equipment drops directly inside the REST transaction response payloads?
• Or should we draft additional unit tests to verify that movement states clip accurately against boundary walls under diagonal touch joysticks vectors?
~~~~
