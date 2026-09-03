import type { ScamCase } from "../../api/types";

export function InvestigationTrace({ activeCase }: { activeCase: ScamCase }) {
  return (
    <section className="investigation" aria-label="Investigation trace">
      <div className="trace-heading"><div className="section-kicker"><span>2</span> Investigation trace</div><p>Facts, checks and inference stay separate.</p></div>
      <article className="trace-stage">
        <div className="stage-marker">1</div>
        <header><span>Stage 1</span><h2>Extracted claims</h2><p>Directly observed in the message. No claim is treated as true.</p></header>
        <div className="claim-table" role="table" aria-label="Extracted claims">
          {activeCase.claims.map((claim) => <div className="claim-row" role="row" key={claim.id}><code>{claim.id.replace("claim-", "C-")}</code><span>{claim.text}</span><small>{claim.provenance}</small></div>)}
        </div>
      </article>
      <article className="trace-stage">
        <div className="stage-marker">2</div>
        <header><span>Stage 2</span><h2>Checked evidence</h2><p>Deterministic offline checks. Suspicious links are parsed, never opened.</p></header>
        <div className="check-list">
          {activeCase.checks.map((check) => <div className="check-row" key={check.id}><span className={`status-dot ${check.result}`} /><div><strong>{check.label}</strong><p>{check.finding}</p></div><small>{check.source}</small><b className={check.result}>{check.result}</b></div>)}
        </div>
      </article>
      <article className="trace-stage final-stage">
        <div className="stage-marker">3</div>
        <header><span>Stage 3</span><h2>Risk assessment</h2><p>{activeCase.advice.summary}</p></header>
        <div className="assessment-line"><strong>{activeCase.assessment.score} / 100</strong><span>{activeCase.assessment.confidence} confidence</span><p>Derived from {activeCase.checks.length} visible checks</p></div>
      </article>
    </section>
  );
}
