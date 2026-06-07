import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, assertTransition } from "./jobState";

test("正常な遷移を許可する", () => {
  assert.ok(canTransition("queued", "running"));
  assert.ok(canTransition("running", "success"));
  assert.ok(canTransition("running", "error"));
  assert.ok(canTransition("queued", "cancelled"));
  assert.ok(canTransition("running", "cancelled"));
});

test("不正な遷移を禁止する", () => {
  assert.equal(canTransition("queued", "success"), false);
  assert.equal(canTransition("success", "running"), false);
  assert.equal(canTransition("error", "running"), false);
  assert.equal(canTransition("cancelled", "running"), false);
});

test("assertTransition は不正で例外", () => {
  assert.throws(() => assertTransition("success", "running"), /遷移できません/);
  assert.doesNotThrow(() => assertTransition("queued", "running"));
});
