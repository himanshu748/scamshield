import type { ScamCase } from "../../api/types";
import { AlertIcon, CheckIcon, ContextIcon, FileIcon } from "../../ui/Icons";

const LABELS = { high_risk: "High risk", needs_context: "Needs context", low_risk: "Low risk" } as const;

interface Props {
  activeCase: ScamCase;
  busy: boolean;
  onDecision: (choice: "approved" | "rejected") => void;
}

export function VerdictActions({ activeCase, busy, onDecision }: Props) {
  const level = activeCase.assessment.level;
  return (
    <aside className={`verdict-edge ${level}`} aria-label="Verdict and safer actions">
      <div className="section-kicker"><span>3</span> Verdict &amp; actions</div>
      <div className="verdict-mark">{level === "high_risk" ? <AlertIcon size={38} /> : level === "needs_context" ? <ContextIcon /> : <CheckIcon />}</div>
      <h2>{LABELS[level]}</h2>
      <p className="verdict-summary">{level === "high_risk" ? "This message is likely a scam." : level === "low_risk" ? "No strong scam signal was found." : "There is not enough evidence to decide safely."}</p>
      <div className="score-line"><span>Risk score</span><strong>{activeCase.assessment.score} / 100</strong></div>
      <section className="reason-block"><h3>Why</h3><ul>{activeCase.assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section>
      <section className="steps-block"><h3>What you can do</h3><ol>{activeCase.assessment.safety_steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
      {activeCase.status === "waiting_for_approval" ? (
        <section className="report-gate">
          <FileIcon /><div><h3>Generate a local report?</h3><p>Creates one redacted Markdown report. Nothing is sent.</p></div>
          <button className="primary-action" type="button" disabled={busy} aria-busy={busy} onClick={() => onDecision("approved")}>{busy ? "Generating report…" : "Generate local report"}</button>
          <button className="text-action" type="button" disabled={busy} onClick={() => onDecision("rejected")}>Skip report</button>
        </section>
      ) : activeCase.status === "report_generated" ? (
        <section className="report-result" aria-live="polite"><CheckIcon /><div><h3>Local report ready</h3><p>Saved to this demo case. Nothing was transmitted.</p></div><details><summary>Preview report</summary><pre>{activeCase.report}</pre></details></section>
      ) : <section className="report-result"><div><h3>No report generated</h3><p>The case remains available locally.</p></div></section>}
    </aside>
  );
}
