import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyRecord, parseRecord, recordExtraction } from "./progress-record.ts";

describe("local service record", () => {
  it("reads legacy records and clamps malformed or negative values", () => {
    assert.deepEqual(parseRecord(JSON.stringify({
      extractions: 3.9,
      best: 72.5,
      kills: -3,
      scrap: Number.POSITIVE_INFINITY,
    })), {
      extractions: 3,
      best: 72.5,
      kills: 0,
      scrap: 0,
    });
  });

  it("rejects unknown envelopes and invalid JSON", () => {
    assert.equal(parseRecord("{"), null);
    assert.equal(parseRecord(JSON.stringify({ schemaVersion: 99, record: emptyRecord() })), null);
  });

  it("adds an extraction without allowing invalid counters or best times", () => {
    assert.deepEqual(recordExtraction(emptyRecord(), { time: 91.25, kills: 4, scrap: 120 }), {
      extractions: 1,
      best: 91.25,
      kills: 4,
      scrap: 120,
    });
    assert.deepEqual(recordExtraction({ extractions: 2, best: 100, kills: 4, scrap: 90 }, {
      time: 80,
      kills: -9,
      scrap: Number.NaN,
    }), {
      extractions: 3,
      best: 80,
      kills: 4,
      scrap: 90,
    });
  });
});
