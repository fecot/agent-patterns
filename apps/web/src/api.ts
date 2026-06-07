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

export interface ChatApproval {
  id: string;
  toolName: string;
  riskLevel: string;
  status: string;
  preview: unknown;
}

export interface ChatResponse {
  requestId: string;
  conversationId: string;
  assistant: AssistantKind;
  reply: string;
  sources: ChatSource[];
  approvals: ChatApproval[];
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

/** 承認: high risk Tool の実行案を承認して実行する。 */
export async function approveApproval(id: string): Promise<void> {
  const res = await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`承認 API がエラーを返しました (${res.status}) ${text}`);
  }
}

/** 却下: 理由を付けて実行案を却下する。 */
export async function rejectApproval(id: string, reason: string): Promise<void> {
  const res = await fetch(`/api/approvals/${id}/reject`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`却下 API がエラーを返しました (${res.status}) ${text}`);
  }
}
