import { useState } from "react";
import { approveApproval, rejectApproval, type ChatApproval } from "../api";

type Resolution = "approved" | "rejected";

/**
 * 承認カード (Phase 6)。
 * high risk Tool の実行案(preview)を表示し、承認/却下を人間が選ぶ。
 */
export function ApprovalCard({ approval }: { approval: ChatApproval }) {
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await approveApproval(approval.id);
      setResolution("approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (busy) return;
    const reason = window.prompt("却下理由を入力してください") ?? "";
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await rejectApproval(approval.id, reason.trim());
      setResolution("rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="approval-card">
      <div className="approval-head">
        ⚠️ 承認が必要な操作: <strong>{approval.toolName}</strong>{" "}
        <span className="risk">[{approval.riskLevel}]</span>
      </div>
      <pre className="approval-preview">{JSON.stringify(approval.preview, null, 2)}</pre>

      {resolution === "approved" && <p className="ok">✅ 承認して実行しました。</p>}
      {resolution === "rejected" && <p className="muted">🚫 却下しました。</p>}

      {resolution === null && (
        <div className="approval-actions">
          <button type="button" onClick={() => void handleApprove()} disabled={busy}>
            承認して実行
          </button>
          <button type="button" onClick={() => void handleReject()} disabled={busy}>
            却下
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
