import type { ScamCase } from "../../api/types";

export function EvidenceRail({ activeCase }: { activeCase: ScamCase }) {
  return (
    <aside className="evidence-rail" aria-label="Redacted source evidence">
      <div className="section-kicker"><span>1</span> Evidence</div>
      <div className="source-meta"><strong>{activeCase.request.channel.toUpperCase()}</strong><time dateTime={activeCase.request.received_at}>{new Date(activeCase.request.received_at).toLocaleString()}</time></div>
      <div className="sender-line"><span>From</span><strong>{activeCase.redacted_sender}</strong></div>
      <blockquote>{activeCase.redacted_content}</blockquote>
      <div className="privacy-note"><strong>Redacted locally</strong><span>Phone numbers, email handles and account identifiers are masked before agent reasoning or storage.</span></div>
      <details open>
        <summary>Source details</summary>
        <dl>
          <div><dt>Channel</dt><dd>{activeCase.request.channel}</dd></div>
          <div><dt>External calls</dt><dd>None</dd></div>
          <div><dt>Links opened</dt><dd>None</dd></div>
          <div><dt>Storage</dt><dd>Local fixture</dd></div>
        </dl>
      </details>
    </aside>
  );
}
