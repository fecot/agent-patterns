import { test } from "node:test";
import assert from "node:assert/strict";
import { routeAssistant, resolveAssistant } from "./router";

test("レポート系は report に振り分ける", () => {
  assert.equal(routeAssistant("先月の集計レポートを作成して").assistant, "report");
});

test("スコア系は scoring に振り分ける", () => {
  assert.equal(routeAssistant("取引先の評価スコアを出して").assistant, "scoring");
});

test("通知/設定系は action に振り分ける", () => {
  assert.equal(routeAssistant("運用チームに通知を送って").assistant, "action");
  assert.equal(routeAssistant("デフォルト設定を変更したい").assistant, "action");
});

test("質問系は knowledge に振り分ける", () => {
  assert.equal(routeAssistant("承認ポリシーの手順を教えて").assistant, "knowledge");
});

test("該当キーワードが無ければ knowledge を既定にする", () => {
  const r = routeAssistant("こんにちは");
  assert.equal(r.assistant, "knowledge");
  assert.equal(r.matched, null);
});

test("resolveAssistant: auto は router 解決、指定済みはそのまま", () => {
  assert.equal(resolveAssistant("auto", "レポート作成").assistant, "report");
  assert.equal(resolveAssistant("knowledge", "レポート作成").assistant, "knowledge");
  assert.equal(resolveAssistant("action", "なんでも").matched, null);
});
