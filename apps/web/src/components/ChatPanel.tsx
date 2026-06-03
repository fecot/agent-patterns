import { useState } from "react";
import { sendChat, type AssistantKind, type ChatSource } from "../api";
import { BuddySelector } from "./BuddySelector";

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
            placeholder="質問や依頼を入力 (⌘/Ctrl+Enter で送信 / Enter で改行)"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // IME 変換中（日本語入力の確定 Enter など）は無視。
              // isComposing は変換中に true。keyCode 229 は一部ブラウザの保険。
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              // 誤爆防止のため素の Enter は改行のまま。送信は ⌘/Ctrl+Enter に限定。
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
