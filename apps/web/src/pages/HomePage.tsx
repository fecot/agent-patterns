import { ChatPanel } from "../components/ChatPanel.js";

export function HomePage() {
  return (
    <div className="app">
      <h1>Business Agent Training Lab</h1>
      <p className="subtitle">
        汎用業務エージェント開発を学ぶためのローカル Docker 完結型リポジトリ
      </p>
      <ChatPanel />
    </div>
  );
}
