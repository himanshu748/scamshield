import type { ScamCase } from "../../api/types";

export function EvidenceRail({ activeCase }: { activeCase: ScamCase }) {
  return (
    <aside className="evidence-rail" aria-label="Redacted source evidence">
      <h2 className="workspace-section-title">Evidence</h2>
      <div className="source-meta"><strong>{activeCase.request.channel.toUpperCase()}</strong><time dateTime={activeCase.request.received_at}>{new Date(activeCase.request.received_at).toLocaleString()}</time></div>
      <div className="sender-line"><span>From</span><strong>{activeCase.redacted_sender}</strong></div>
      <blockquote>{activeCase.redacted_content}</blockquote>
      <div className="privacy-note"><strong>Detected details masked</strong><span>Local redaction removes detected personal details and private URL fields. It can miss sensitive information; check this record before sharing.</span></div>
      <details open>
        <summary>Source details</summary>
        <dl>
          <div><dt>Channel</dt><dd>{activeCase.request.channel}</dd></div>
          <div><dt>Links opened</dt><dd>None</dd></div>
          <div><dt>Storage</dt><dd>Local SQLite</dd></div>
          <div><dt>Sender context</dt><dd>{activeCase.request.sender_confirmed ? "Confirmed by you" : "Unverified"}</dd></div>
        </dl>
      </details>
      {activeCase.events.length > 0 && <details className="case-activity"><summary>Case activity</summary><ol>{activeCase.events.map((event, index) => <li key={`${event.kind}-${index}`}><span>{event.summary}</span><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time></li>)}</ol></details>}
    </aside>
  );
}
