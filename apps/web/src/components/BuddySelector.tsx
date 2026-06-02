import type { AssistantKind } from "../api";

const OPTIONS: { kind: AssistantKind; label: string }[] = [
  { kind: "auto", label: "Auto (Router)" },
  { kind: "knowledge", label: "Knowledge" },
  { kind: "action", label: "Action" },
  { kind: "report", label: "Report" },
  { kind: "scoring", label: "Scoring" },
];

export function BuddySelector(props: {
  value: AssistantKind;
  onChange: (kind: AssistantKind) => void;
}) {
  return (
    <div className="buddy-selector">
      {OPTIONS.map((o) => (
        <button
          key={o.kind}
          className={o.kind === props.value ? "active" : ""}
          onClick={() => props.onChange(o.kind)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
