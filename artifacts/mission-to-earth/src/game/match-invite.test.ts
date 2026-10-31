import assert from "node:assert/strict";
import test from "node:test";
import { copyMatchIdToClipboard } from "./match-invite.ts";

test("copies a private match ID through the available clipboard", async () => {
  let copied = "";
  const result = await copyMatchIdToClipboard("  match-id-123  ", {
    writeText: async (value) => {
      copied = value;
    },
  });

  assert.equal(result, true);
  assert.equal(copied, "match-id-123");
});

test("reports unavailable clipboard access without throwing", async () => {
  assert.equal(await copyMatchIdToClipboard("match-id-123"), false);
  assert.equal(
    await copyMatchIdToClipboard("match-id-123", {
      writeText: async () => {
        throw new Error("clipboard blocked");
      },
    }),
    false,
  );
});
