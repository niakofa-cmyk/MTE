import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractionEpilogue } from "./mission-epilogue.ts";

describe("extraction epilogue", () => {
  it("surfaces the Mars invasion threat when Eon Dusk plans are extracted", () => {
    assert.match(extractionEpilogue(true), /invasion of Mars/);
    assert.match(extractionEpilogue(true), /Nod's signal/);
  });

  it("does not reveal unextracted plans in the mission ending", () => {
    assert.equal(
      extractionEpilogue(false),
      "The beacon connects Nod's resistance. Eon Dusk's wider plan remains hidden.",
    );
  });
});
