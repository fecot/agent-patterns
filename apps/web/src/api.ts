// API クライアント。Vite の proxy 経由で /api/* を叩く。
// 型は学習しやすさ優先でこのファイルにローカル定義している
// (将来 @lab/shared の Zod 型に揃える余地あり)。

export type AssistantKind =
  | "auto"
  | "knowledge"
  | "action"
  | "report"
  | "scoring";

export interface ChatSource {
  documentId: string;
  title: string;
}

export interface ChatResponse {
  requestId: string;
  conversationId: string;
  assistant: AssistantKind;
  reply: string;
  sources: ChatSource[];
}

export async function sendChat(params: {
  message: string;
  assistant: AssistantKind;
  workspaceId: string;
}): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`チャット API がエラーを返しました (${res.status}) ${text}`);
  }
  return (await res.json()) as ChatResponse;
}
