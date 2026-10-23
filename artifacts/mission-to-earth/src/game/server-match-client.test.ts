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

function snapshot(lastProcessedSequence = 0) {
  return {
    matchId,
    snapshot: {
      players: [{
        playerId,
        lastProcessedSequence,
        position: { x: 0, y: 0, z: 86 },
        yaw: -180,
        pitch: 0,
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
  it("creates a match, joins it, and reads the server inventory", async () => {
    const storage = new MemoryStorage();
    const calls: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      const path = String(input);
      calls.push(path);
      if (path === "/api/matches") return response(201, { matchId });
      if (path === `/api/matches/${matchId}/players`) {
        return response(201, { matchId, playerId, accessToken, snapshot: snapshot().snapshot });
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
        return response(201, { matchId, playerId, accessToken, snapshot: snapshot().snapshot });
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
        return response(201, { matchId, playerId, accessToken, snapshot: snapshot().snapshot });
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
