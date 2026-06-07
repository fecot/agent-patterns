import { test } from "node:test";
import assert from "node:assert/strict";
import { MockProvider } from "./mockProvider";
import type { ToolDefinition } from "../types";

const tools: ToolDefinition[] = [
  { name: "searchRecords", description: "", inputSchema: {} },
  { name: "searchDocuments", description: "", inputSchema: {} },
];

test("ドキュメント系キーワードで searchDocuments を呼ぶ", async () => {
  const res = await new MockProvider().generate({
    taskName: "chat.reply",
    messages: [{ role: "user", content: "承認ポリシーの手順を教えて" }],
    tools,
  });
  assert.equal(res.toolCalls?.[0]?.name, "searchDocuments");
});

test("レコード系キーワードで searchRecords を呼ぶ", async () => {
  const res = await new MockProvider().generate({
    taskName: "chat.reply",
    messages: [{ role: "user", content: "未対応レコードの履歴を見たい" }],
    tools,
  });
  assert.equal(res.toolCalls?.[0]?.name, "searchRecords");
});

test("該当キーワードが無ければ通常テキストを返す", async () => {
  const res = await new MockProvider().generate({
    taskName: "chat.reply",
    messages: [{ role: "user", content: "こんにちは" }],
    tools,
  });
  assert.equal(res.toolCalls, undefined);
  assert.ok((res.text ?? "").length > 0);
});

test("tool 結果が既にあれば再度 tool を呼ばず最終回答を返す", async () => {
  const res = await new MockProvider().generate({
    taskName: "chat.reply",
    messages: [
      { role: "user", content: "ポリシーを教えて" },
      { role: "assistant", content: "tool_call: searchDocuments" },
      { role: "tool", content: '{"ok":true,"data":{"documents":[]}}' },
    ],
    tools,
  });
  assert.equal(res.toolCalls, undefined);
  assert.match(res.text ?? "", /Tool 実行結果/);
});

test("tools 未提供なら従来どおりテキスト応答", async () => {
  const res = await new MockProvider().generate({
    taskName: "chat.reply",
    messages: [{ role: "user", content: "レコードを見せて" }],
  });
  assert.equal(res.toolCalls, undefined);
  assert.ok((res.text ?? "").length > 0);
});
