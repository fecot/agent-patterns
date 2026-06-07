import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkMarkdown } from "./chunk";

test("空行で段落に分け、maxChars を超えないよう詰める", () => {
  const md = "# 見出し\n\n段落A。\n\n段落B。\n\n段落C。";
  const chunks = chunkMarkdown(md, { maxChars: 12, overlap: 0 });
  assert.ok(chunks.length >= 2);
  for (const c of chunks) assert.ok(c.length <= 12, `chunk too long: ${c}`);
});

test("空文字は空配列", () => {
  assert.deepEqual(chunkMarkdown("   \n\n  "), []);
});

test("maxChars を超える単一段落は固定長で割る", () => {
  const long = "あ".repeat(100);
  const chunks = chunkMarkdown(long, { maxChars: 30, overlap: 5 });
  assert.ok(chunks.length >= 4);
  for (const c of chunks) assert.ok(c.length <= 30);
});

test("全文がチャンクに含まれる（語の取りこぼしが無い）", () => {
  const md = "policy alpha\n\nbravo charlie\n\ndelta echo";
  const chunks = chunkMarkdown(md, { maxChars: 20, overlap: 4 });
  const joined = chunks.join(" ");
  for (const word of ["policy", "alpha", "bravo", "charlie", "delta", "echo"]) {
    assert.ok(joined.includes(word), `missing ${word}`);
  }
});
