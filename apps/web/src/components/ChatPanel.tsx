import { useState } from "react";
import { sendChat, type AssistantKind, type ChatSource } from "../api.js";
import { BuddySelector } from "./BuddySelector.js";

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

// 学習用のため workspaceId は固定値。seed で同じ ID を投入する。
const WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export function ChatPanel() {
  const [assistant, setAssistant] = useState<AssistantKind>("auto");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const message = input.trim();
    if (!message || loading) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChat({ message, assistant, workspaceId: WORKSPACE_ID });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, sources: res.sources },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <BuddySelector value={assistant} onChange={setAssistant} />

      <div className="chat">
        <div className="chat-log">
          {messages.length === 0 && (
            <div className="msg assistant">
              メッセージを送信してください。現在は Mock Provider が応答します。
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div className="sources">
                  根拠: {m.sources.map((s) => s.title).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <textarea
            rows={2}
            value={input}
            placeholder="質問や依頼を入力 (Enter で送信 / Shift+Enter で改行)"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button type="button" onClick={() => void handleSend()} disabled={loading}>
            {loading ? "..." : "送信"}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
