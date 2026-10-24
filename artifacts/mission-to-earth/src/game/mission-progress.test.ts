import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyMars, loadMars, saveMars } from "./mars-stash.ts";
import { persistExtractionWin, recoverPendingExtraction } from "./mission-progress.ts";
import { emptyRecord, loadRecord, saveRecord } from "./progress-record.ts";

function withLocalStorage<T>(run: (failKeys: Set<string>, values: Map<string, string>) => T): T {
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
    return run(failKeys, values);
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
      assert.equal(recoverPendingExtraction().pending, false);
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
      assert.equal(recoverPendingExtraction().pending, true);
    });
  });

  it("replays an interrupted staged save without applying a second reward", () => {
    withLocalStorage((failKeys) => {
      saveRecord({ extractions: 2, best: 100, kills: 3, scrap: 90 });
      const originalMars = { ...emptyMars(), martianCredits: 160 };
      saveMars(originalMars);
      failKeys.add("mte-mars-v2");

      const event = { time: 80, kills: 1, scrap: 25, manifest: [] };
      const interrupted = persistExtractionWin(event);
      assert.equal(interrupted.saved, false);
      assert.equal(interrupted.record.extractions, 3);
      assert.equal(interrupted.mars.martianCredits, 160);

      const blocked = persistExtractionWin({ ...event, time: 75 });
      assert.equal(blocked.saved, false);
      assert.equal(blocked.record.extractions, 3);

      failKeys.delete("mte-mars-v2");
      const recovered = recoverPendingExtraction();
      assert.equal(recovered.pending, false);
      assert.equal(recovered.record.extractions, 3);
      assert.equal(recovered.record.best, 80);
      assert.equal(recovered.mars.martianCredits, 185);
      assert.deepEqual(loadRecord(), recovered.record);
      assert.deepEqual(loadMars(), recovered.mars);
    });
  });

  it("does not mutate either save if the journal cannot be staged", () => {
    withLocalStorage((failKeys) => {
      const originalRecord = { extractions: 2, best: 100, kills: 3, scrap: 90 };
      const originalMars = { ...emptyMars(), martianCredits: 160 };
      saveRecord(originalRecord);
      saveMars(originalMars);
      failKeys.add("mte-extraction-wal-v1");

      const result = persistExtractionWin({
        time: 80,
        kills: 1,
        scrap: 25,
        manifest: [],
      });

      assert.equal(result.saved, false);
      assert.deepEqual(loadRecord(), originalRecord);
      assert.deepEqual(loadMars(), originalMars);
    });
  });

  it("retains an invalid journal and blocks reward writes rather than guessing", () => {
    withLocalStorage((_failKeys, values) => {
      values.set("mte-extraction-wal-v1", "{invalid");
      const recovery = recoverPendingExtraction();
      assert.equal(recovery.pending, true);
      assert.equal(values.get("mte-extraction-wal-v1"), "{invalid");
      assert.equal(persistExtractionWin({
        time: 80,
        kills: 1,
        scrap: 25,
        manifest: [],
      }).saved, false);
      assert.equal(loadRecord().extractions, 0);
    });
  });

  it("does not manufacture a record when loading an empty save", () => {
    withLocalStorage(() => {
      assert.deepEqual(loadRecord(), emptyRecord());
    });
  });
});
