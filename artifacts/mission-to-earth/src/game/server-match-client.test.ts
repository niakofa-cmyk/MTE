import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ServerMatchClient } from "./server-match-client.ts";

const matchId = "11111111-1111-4111-8111-111111111111";
const playerId = "22222222-2222-4222-8222-222222222222";
const accessToken = "a".repeat(43);

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function snapshot(lastProcessedSequence = 0, operatorId: "jaya" | "aset" = "jaya") {
  const rightWeapon = operatorId === "aset" ? "rail" : "smg";
  const abilityId = operatorId === "aset" ? "RAS_RADIANCE" : "TEMPORAL_PHASE";
  return {
    matchId,
    snapshot: {
      protocolVersion: 3,
      players: [{
        playerId,
        lastProcessedSequence,
        position: { x: 0, y: 0, z: 86 },
        yaw: -180,
        pitch: 0,
        health: 100,
        operatorId,
        rightHandState: "IDLE",
        leftHandState: "IDLE",
        rightWeapon: {
          weaponId: rightWeapon,
          ammoInMagazine: operatorId === "aset" ? 5 : 34,
          reserveAmmo: 68,
          maxClipSize: operatorId === "aset" ? 5 : 34,
          isReloading: false,
          reloadRemainingSeconds: 0,
        },
        leftWeapon: {
          weaponId: "pistol",
          ammoInMagazine: 14,
          reserveAmmo: 28,
          maxClipSize: 14,
          isReloading: false,
          reloadRemainingSeconds: 0,
        },
        ability: {
          abilityId,
          isActive: false,
          cooldownRemainingSeconds: 0,
          activeDurationRemainingSeconds: 0,
        },
        isFocusAiming: false,
      }],
    },
  };
}

function gameplay(inventory: unknown[] = []) {
  return {
    matchId,
    gameplay: {
      lootSpawns: [],
      terminals: [],
      objectives: [],
      inventory,
    },
  };
}

describe("server match client", () => {
  it("hosts and joins Cinder Row with an isolated saved session and server team", async () => {
    const storage = new MemoryStorage();
    const calls: Array<{ path: string; body: string | null }> = [];
    const arena = snapshot().snapshot as ReturnType<typeof snapshot>["snapshot"] & {
      mapId: "cinder-row-blackout";
      mapVersion: string;
      arenaRound: {
        phase: "waiting";
        remainingSeconds: number;
        relayProgress: number;
        controlledBy: null;
        contested: boolean;
        accordPlayers: number;
        duskPlayers: number;
        winner: null;
      };
      players: Array<ReturnType<typeof snapshot>["snapshot"]["players"][number] & {
        team: "accord";
      }>;
    };
    arena.mapId = "cinder-row-blackout";
    arena.mapVersion = "1.0.0";
    arena.arenaRound = {
      phase: "waiting",
      remainingSeconds: 180,
      relayProgress: 0,
      controlledBy: null,
      contested: false,
      accordPlayers: 1,
      duskPlayers: 0,
      winner: null,
    };
    arena.players[0].team = "accord";

    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      calls.push({ path, body: typeof init?.body === "string" ? init.body : null });
      if (path === "/api/matches") return response(201, {
        matchId,
        mapId: "cinder-row-blackout",
      });
      if (path === `/api/matches/${matchId}/players`) {
        return response(201, {
          matchId,
          playerId,
          operatorId: "jaya",
          accessToken,
          snapshot: arena,
        });
      }
      if (path === `/api/matches/${matchId}/world-state`) return response(200, gameplay());
      throw new Error(`Unexpected request: ${path}`);
    }) as typeof fetch;

    const connected = await ServerMatchClient.connect({
      fetcher,
      storage,
      mapId: "cinder-row-blackout",
    });
    assert.equal(connected.snapshot.mapId, "cinder-row-blackout");
    assert.equal(connected.player.team, "accord");
    assert.equal(connected.snapshot.arenaRound?.phase, "waiting");
    assert.equal(
      JSON.parse(calls.find((call) => call.path === "/api/matches")?.body ?? "{}").mapId,
      "cinder-row-blackout",
    );
    assert.ok(storage.getItem("mte.server-match.v1:cinder-row-blackout"));
    assert.equal(storage.getItem("mte.server-match.v1"), null);
  });

  it("creates a match, joins it, and reads the server inventory", async () => {
    const storage = new MemoryStorage();
    const calls: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      const path = String(input);
      calls.push(path);
      if (path === "/api/matches") return response(201, { matchId });
      if (path === `/api/matches/${matchId}/players`) {
        return response(201, {
          matchId,
          playerId,
          operatorId: "jaya",
          accessToken,
          snapshot: snapshot().snapshot,
        });
      }
      if (path === `/api/matches/${matchId}/world-state`) return response(200, gameplay());
      throw new Error(`Unexpected request: ${path}`);
    }) as typeof fetch;

    const connected = await ServerMatchClient.connect({ fetcher, storage });
    assert.equal(connected.restored, false);
    assert.deepEqual(connected.player.position, { x: 0, y: 0, z: 86 });
    assert.deepEqual(connected.gameplay.inventory, []);
    assert.deepEqual(calls, [
      "/api/matches",
      `/api/matches/${matchId}/players`,
      `/api/matches/${matchId}/world-state`,
    ]);
    assert.ok(storage.getItem("mte.server-match.v1")?.includes(accessToken));
  });

  it("sends the selected operator and accepts only the server-assigned profile", async () => {
    let joinBody: unknown;
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/matches") return response(201, { matchId });
      if (path === `/api/matches/${matchId}/players`) {
        joinBody = JSON.parse(String(init?.body));
        return response(201, {
          matchId,
          playerId,
          operatorId: "aset",
          accessToken,
          snapshot: snapshot(0, "aset").snapshot,
        });
      }
      if (path === `/api/matches/${matchId}/world-state`) {
        return response(200, gameplay());
      }
      throw new Error(`Unexpected request: ${path}`);
    }) as typeof fetch;

    const connected = await ServerMatchClient.connect({
      fetcher,
      storage: null,
      operatorId: "aset",
    });
    assert.deepEqual(joinBody, { operatorId: "aset" });
    assert.equal(connected.operatorId, "aset");
    assert.equal(connected.player.rightWeapon.weaponId, "rail");
    assert.equal(connected.player.ability.abilityId, "RAS_RADIANCE");
  });

  it("restores a same-tab session and rehydrates its server-owned inventory", async () => {
    const storage = new MemoryStorage();
    const item = {
      lootId: "map-loot-0001",
      kind: "weapon",
      label: "NOD RIFLE",
      scrap: 4,
      weaponId: "rifle",
    };
    const setupFetcher = (async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/matches") return response(201, { matchId });
      if (path.endsWith("/players")) {
        return response(201, {
          matchId,
          playerId,
          operatorId: "jaya",
          accessToken,
          snapshot: snapshot().snapshot,
        });
      }
      return response(200, gameplay());
    }) as typeof fetch;
    await ServerMatchClient.connect({ fetcher: setupFetcher, storage });

    const restoreFetcher = (async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith("/snapshot")) return response(200, snapshot(8));
      if (path.endsWith("/world-state")) return response(200, gameplay([item]));
      throw new Error(`Unexpected request: ${path}`);
    }) as typeof fetch;
    const restored = await ServerMatchClient.connect({ fetcher: restoreFetcher, storage });

    assert.equal(restored.restored, true);
    assert.equal(restored.player.lastProcessedSequence, 8);
    assert.deepEqual(restored.gameplay.inventory, [item]);
  });

  it("recovers a claim response lost to a retry by reading the server ledger", async () => {
    const storage = new MemoryStorage();
    const item = {
      lootId: "map-loot-0001",
      kind: "ammo",
      label: "AMMO",
      scrap: 0,
    };
    const setupFetcher = (async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/api/matches") return response(201, { matchId });
      if (path.endsWith("/players")) {
        return response(201, {
          matchId,
          playerId,
          operatorId: "jaya",
          accessToken,
          snapshot: snapshot().snapshot,
        });
      }
      return response(200, gameplay());
    }) as typeof fetch;
    const { client } = await ServerMatchClient.connect({ fetcher: setupFetcher, storage });

    const retryFetcher = (async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.endsWith("/snapshot")) return response(200, snapshot(8));
      if (path.endsWith("/loot/map-loot-0001/claim")) {
        return response(409, { error: "loot-already-claimed" });
      }
      if (path.endsWith("/world-state")) return response(200, gameplay([item]));
      return response(500, { error: `unexpected-request:${path}` });
    }) as typeof fetch;
    const retryClient = await ServerMatchClient.connect({ fetcher: retryFetcher, storage });
    const result = await retryClient.client.claimLoot("map-loot-0001");

    assert.deepEqual(result.item, item);
    assert.deepEqual(result.inventory, [item]);
    assert.equal(client.playerId, playerId);
  });
});
