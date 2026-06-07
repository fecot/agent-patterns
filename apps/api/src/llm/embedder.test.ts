import { test } from "node:test";
import assert from "node:assert/strict";
import { MockEmbedder, EMBEDDING_DIM, toVectorLiteral } from "./embedder";

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot; // 正規化済み前提
}

test("1536 次元・決定的・L2 正規化", async () => {
  const e = new MockEmbedder();
  const [v1] = await e.embed(["承認ポリシーの手順"]);
  const [v2] = await e.embed(["承認ポリシーの手順"]);
  assert.equal(v1!.length, EMBEDDING_DIM);
  assert.deepEqual(v1, v2); // 決定的
  let norm = 0;
  for (const x of v1!) norm += x * x;
  assert.ok(Math.abs(Math.sqrt(norm) - 1) < 1e-9);
});

test("語を共有するテキストは無関係なテキストより cosine が高い", async () => {
  const e = new MockEmbedder();
  const [q] = await e.embed(["承認ポリシーの手順を教えて"]);
  const [near] = await e.embed(["承認ポリシーの承認手順について"]);
  const [far] = await e.embed(["今日の天気はとても良い晴れです"]);
  assert.ok(cosine(q!, near!) > cosine(q!, far!));
});

test("空文字はゼロベクトル", async () => {
  const [v] = await new MockEmbedder().embed([""]);
  assert.ok(v!.every((x) => x === 0));
});

test("toVectorLiteral は pgvector 形式", () => {
  assert.equal(toVectorLiteral([1, 0.5, -2]), "[1,0.5,-2]");
});
