import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyMars, loadMars, saveMars } from "./mars-stash.ts";
import { persistExtractionWin } from "./mission-progress.ts";
import { emptyRecord, loadRecord, saveRecord } from "./progress-record.ts";

function withLocalStorage<T>(run: (failKeys: Set<string>) => T): T {
  const values = new Map<string, string>();
  const failKeys = new Set<string>();
  const storage = {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(String(key)) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(String(key));
    },
    setItem(key: string, value: string) {
      const normalizedKey = String(key);
      if (failKeys.has(normalizedKey)) throw new Error("Storage write denied");
      values.set(normalizedKey, String(value));
    },
  } as Storage;
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
    writable: true,
  });

  try {
    return run(failKeys);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
  }
}

describe("extraction progress persistence", () => {
  it("saves and reads back both the service record and local rewards", () => {
    withLocalStorage(() => {
      saveRecord({ extractions: 2, best: 100, kills: 3, scrap: 90 });
      saveMars({ ...emptyMars(), martianCredits: 160 });

      const result = persistExtractionWin({
        time: 80,
        kills: 1,
        scrap: 25,
        manifest: [],
      });

      assert.equal(result.saved, true);
      assert.deepEqual(result.record, {
        extractions: 3,
        best: 80,
        kills: 4,
        scrap: 115,
      });
      assert.equal(result.mars.martianCredits, 185);
      assert.deepEqual(loadRecord(), result.record);
      assert.deepEqual(loadMars(), result.mars);
    });
  });

  it("records a completed extraction even if the profile save fails", () => {
    withLocalStorage((failKeys) => {
      saveRecord({ extractions: 2, best: 100, kills: 3, scrap: 90 });
      const originalMars = { ...emptyMars(), martianCredits: 160 };
      saveMars(originalMars);
      failKeys.add("mte-mars-v2");

      const result = persistExtractionWin({
        time: 80,
        kills: 1,
        scrap: 25,
        manifest: [],
      });

      assert.equal(result.saved, false);
      assert.equal(result.record.extractions, 3);
      assert.deepEqual(loadRecord(), result.record);
      assert.deepEqual(loadMars(), originalMars);
    });
  });

  it("does not manufacture a record when loading an empty save", () => {
    withLocalStorage(() => {
      assert.deepEqual(loadRecord(), emptyRecord());
    });
  });
});
