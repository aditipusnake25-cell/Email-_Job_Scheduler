import { test, describe } from "node:test";
import assert from "node:assert";
import { generateIdempotencyKey, isValidIdempotencyKey } from "../src/utils/idempotency.js";

describe("Idempotency Utility", () => {
  test("generates deterministic hash for identical parameters", () => {
    const key1 = generateIdempotencyKey(["campaign-1", "user@test.com", "2026-10-16T12:00:00Z"]);
    const key2 = generateIdempotencyKey(["campaign-1", "user@test.com", "2026-10-16T12:00:00Z"]);

    assert.strictEqual(key1, key2, "Keys should be identical for identical input");
    assert.strictEqual(key1.length, 32, "Key length should be 32 characters");
  });

  test("generates different hashes for different inputs", () => {
    const key1 = generateIdempotencyKey(["campaign-1", "userA@test.com"]);
    const key2 = generateIdempotencyKey(["campaign-1", "userB@test.com"]);

    assert.notStrictEqual(key1, key2, "Different recipients must yield distinct keys");
  });

  test("validates valid and invalid key lengths", () => {
    assert.strictEqual(isValidIdempotencyKey("valid-key-123456"), true);
    assert.strictEqual(isValidIdempotencyKey("short"), false);
    assert.strictEqual(isValidIdempotencyKey(""), false);
  });
});
