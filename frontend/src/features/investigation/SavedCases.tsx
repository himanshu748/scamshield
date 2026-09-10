import { useState } from "react";
import type { ScamCase } from "../../api/types";

const LEVELS = { high_risk: "High risk", needs_context: "Needs context", low_risk: "Low risk" } as const;
const REPORTS = { waiting_for_approval: "Report optional", report_generated: "Report ready", report_rejected: "Report skipped" } as const;

export function SavedCases({ cases, loading, busy, onOpen, onClose }: {
  cases: ScamCase[];
  loading: boolean;
  busy: boolean;
  onOpen: (item: ScamCase) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const matching = cases.filter(item => (level === "all" || item.assessment.level === level)
    && `${item.redacted_sender} ${item.redacted_content} ${item.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  return <section className="saved-records" aria-labelledby="saved-cases-title" aria-busy={loading}>
    <header className="saved-heading"><div><h2 id="saved-cases-title">Saved cases</h2><p>Redacted records on this device. Nothing is reported automatically.</p></div><button type="button" onClick={onClose}>Close saved cases</button></header>
    {loading ? <div className="history-loading" role="status">Loading saved cases…<span /><span /><span /></div> : cases.length ? <>
      <div className="history-filters"><label>Find a case<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Sender, message or case ID" /></label><label>Assessment<select value={level} onChange={event => setLevel(event.target.value)}><option value="all">All assessments</option>{Object.entries(LEVELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <p className="history-count" role="status">{matching.length} of {cases.length} recent {cases.length === 1 ? "case" : "cases"}</p>
      {matching.length ? <ul className="case-list">{matching.map(item => <li key={item.id}><button type="button" className="case-record" disabled={busy} aria-label={`${item.id}: ${item.assessment.level.replaceAll("_", " ")}`} onClick={() => onOpen(item)}>
        <span className="case-record-heading"><strong>{item.redacted_sender}</strong><span className={`case-risk ${item.assessment.level}`}>{LEVELS[item.assessment.level]}</span></span>
        <span className="case-excerpt">{item.redacted_content}</span>
        <span className="case-record-meta"><span>{item.request.channel.toUpperCase()} · <time dateTime={item.request.received_at}>{new Date(item.request.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></span><span>{REPORTS[item.status]}</span><span className="open-case-label">Open case</span></span>
      </button></li>)}</ul> : <p className="history-empty">No cases match these filters. Try a different sender or assessment.</p>}
    </> : <div className="history-empty"><h3>Your first review will appear here.</h3><p>Check a message to save its redacted evidence and assessment. You can reopen it or delete it later.</p></div>}
  </section>;
}
