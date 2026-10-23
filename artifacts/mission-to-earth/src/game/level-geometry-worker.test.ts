import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { SerializedStaticNode } from "./level-geometry-export.ts";
import { persistWorldGeometry } from "./level-geometry-worker.ts";

const sample: SerializedStaticNode[] = [
  {
    id: 1_000,
    type: "building",
    posX: 3,
    posY: 2,
    posZ: -1,
    sizeX: 6,
    sizeY: 4,
    sizeZ: 2,
  },
];

describe("level geometry file worker", () => {
  it("atomically writes a validated JSON asset and reports its size", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mte-level-export-"));
    const outputPath = join(directory, "nod-level-geometry.json");
    try {
      const result = await persistWorldGeometry(sample, outputPath);
      const contents = await readFile(outputPath, "utf8");

      assert.equal(result.path, outputPath);
      assert.equal(result.nodeCount, 1);
      assert.equal(result.byteLength, Buffer.byteLength(contents, "utf8"));
      assert.deepEqual(JSON.parse(contents), sample);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("leaves an existing asset untouched when validation fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mte-level-export-"));
    const outputPath = join(directory, "nod-level-geometry.json");
    const original = '[{"existing":true}]\n';
    try {
      await writeFile(outputPath, original, "utf8");
      await assert.rejects(
        persistWorldGeometry(
          [{ ...sample[0]!, sizeX: 0 }],
          outputPath,
        ),
        /dimensions must be positive/,
      );
      assert.equal(await readFile(outputPath, "utf8"), original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
