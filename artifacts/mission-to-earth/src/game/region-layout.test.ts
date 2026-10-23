import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOREST_TREES,
  REGION_LANDMARKS,
  REGION_LIMIT,
  REGION_ROUTES,
  isForestCell,
} from "./region-layout.ts";

describe("Nod region layout", () => {
  it("defines all six requested explorable landmarks within the current world bounds", () => {
    assert.deepEqual(
      REGION_LANDMARKS.map((place) => place.id).sort(),
      ["checkpoint", "forest-route", "hostile-compound", "mission-facility", "rescue-site", "settlement"],
    );
    for (const place of REGION_LANDMARKS) {
      assert.ok(Math.abs(place.x) <= REGION_LIMIT);
      assert.ok(Math.abs(place.z) <= REGION_LIMIT);
    }
  });

  it("offers two distinct street approaches to the hostile compound and two routes to the rescue site", () => {
    assert.equal(REGION_ROUTES.filter((route) => route.to === "hostile-compound").length, 2);
    assert.equal(REGION_ROUTES.filter((route) => route.to === "rescue-site").length, 2);
    for (const route of REGION_ROUTES) {
      assert.ok(route.points.length >= 2);
      const from = REGION_LANDMARKS.find((place) => place.id === route.from)!;
      const to = REGION_LANDMARKS.find((place) => place.id === route.to)!;
      assert.deepEqual(route.points[0], { x: from.x, z: from.z });
      assert.deepEqual(route.points.at(-1), { x: to.x, z: to.z });
    }
  });

  it("carves a continuous west-side corridor with trees kept off the trail centerline", () => {
    assert.equal(isForestCell(-3), true);
    assert.equal(isForestCell(-2), false);
    assert.ok(FOREST_TREES.length >= 30);
    assert.ok(FOREST_TREES.every((tree) => Math.abs(tree.x + 126) > 8));
    assert.ok(FOREST_TREES.every((tree) => Math.abs(tree.x) < REGION_LIMIT && Math.abs(tree.z) < REGION_LIMIT));
  });
});
