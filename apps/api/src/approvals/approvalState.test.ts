import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, statusAfterApprove, assertTransition } from "./approvalState";

test("pending からのみ承認/却下できる", () => {
  assert.equal(canTransition("pending", "approve"), true);
  assert.equal(canTransition("pending", "reject"), true);
});

test("終端状態からは遷移できない", () => {
  for (const s of ["approved", "executed", "failed", "rejected"] as const) {
    assert.equal(canTransition(s, "approve"), false);
    assert.equal(canTransition(s, "reject"), false);
  }
});

test("statusAfterApprove は実行結果で executed/failed", () => {
  assert.equal(statusAfterApprove(true), "executed");
  assert.equal(statusAfterApprove(false), "failed");
});

test("assertTransition は不正遷移で例外", () => {
  assert.throws(() => assertTransition("executed", "approve"), /できません/);
  assert.doesNotThrow(() => assertTransition("pending", "approve"));
});
