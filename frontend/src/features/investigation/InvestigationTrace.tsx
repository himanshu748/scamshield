import type { ScamCase } from "../../api/types";

export function InvestigationTrace({ activeCase }: { activeCase: ScamCase }) {
  return (
    <section className="investigation" aria-label="Investigation trace">
      <div className="trace-heading"><h2 className="workspace-section-title">Investigation trace</h2><p>Facts, checks and inference stay separate.</p></div>
      <article className="trace-stage">
        <div className="stage-marker">1</div>
        <header><h3>Extracted claims</h3><p>Directly observed in the message. No claim is treated as true.</p></header>
        <div className="claim-table" role="table" aria-label="Extracted claims">
          <div className="claim-row claim-head" role="row"><span role="columnheader">Reference</span><span role="columnheader">Observed claim</span><span role="columnheader">Provenance</span></div>
          <div role="rowgroup">
            {activeCase.claims.map((claim) => <div className="claim-row" role="row" key={claim.id}><code role="cell">{claim.id.replace("claim-", "C-")}</code><span role="cell">{claim.text}</span><small role="cell">{claim.provenance}</small></div>)}
          </div>
        </div>
      </article>
      <article className="trace-stage">
        <div className="stage-marker">2</div>
        <header><h3>Checked evidence</h3><p>Deterministic offline checks. Suspicious links are parsed, never opened.</p></header>
        <div className="check-list">
          {activeCase.checks.map((check) => <div className="check-row" key={check.id}><span className={`status-dot ${check.result}`} aria-hidden="true" /><div><strong>{check.label}</strong><p>{check.finding}</p></div><small>{check.source}</small><b className={check.result}>{check.result === "safe" ? "No signal" : check.result === "risky" ? "Warning" : "Unknown"}</b></div>)}
        </div>
      </article>
      <article className="trace-stage final-stage">
        <div className="stage-marker">3</div>
        <header><h3>Risk assessment</h3><p>{activeCase.advice.summary}</p></header>
        <div className="assessment-line"><strong>{activeCase.assessment.score} / 100</strong><span>{activeCase.assessment.confidence} rule confidence</span><p>Derived from {activeCase.checks.length} visible checks</p></div>
        <p className="assessment-limit">Confidence describes this rule-based assessment. It is not independently calibrated against real-world fraud outcomes.</p>
      </article>
    </section>
  );
}
