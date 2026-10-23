import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateContainerDropArray, resolveExtractionDrop } from "./extraction-loot.ts";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rolls(site: { sectorTier: number; uprisingActive: boolean; localDangerFactor: number }, progress: number, n: number) {
  const rand = rng(20261022 + n + site.sectorTier);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(...generateContainerDropArray(site, progress, rand));
  return ids;
}

describe("extraction terminals", () => {
  it("fills a crate with four registry ids", () => {
    const ids = generateContainerDropArray({ sectorTier: 2, uprisingActive: false, localDangerFactor: 1 }, 0, rng(1));
    assert.equal(ids.length, 4);
    for (const id of ids) assert.ok(resolveExtractionDrop(id));
  });

  it("keeps anomalies and legendaries out of a quiet early street", () => {
    const ids = rolls({ sectorTier: 2, uprisingActive: false, localDangerFactor: 1 }, 0, 200);
    assert.equal(ids.includes("intel_pure_blood_dna"), false);
    assert.equal(ids.includes("att_chrono_tracer_scope_06"), false);
    assert.equal(ids.includes("intel_eon_dusk_schematic"), false);
    assert.ok(ids.includes("wep_scav_smg_01"));
  });

  it("never puts the lineage key outside the monolith", () => {
    const ids = rolls({ sectorTier: 3, uprisingActive: true, localDangerFactor: 5 }, 1, 200);
    assert.equal(ids.includes("intel_pure_blood_dna"), false);
    assert.ok(ids.includes("att_chrono_tracer_scope_06"));
  });

  it("pays the chrono scope once the monolith is burning", () => {
    const ids = rolls({ sectorTier: 4, uprisingActive: true, localDangerFactor: 5 }, 1, 80);
    assert.ok(ids.includes("att_chrono_tracer_scope_06"));
    assert.ok(ids.includes("intel_pure_blood_dna"));
    const drop = resolveExtractionDrop("att_chrono_tracer_scope_06");
    assert.equal(drop?.scrap, 950);
    assert.equal(drop?.modId, "att_chrono_tracer_scope_06");
  });
});
