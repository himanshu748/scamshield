import { useState } from "react";

import { analyzeMessage, decideReport, getDemoMessage } from "../api/client";
import type { ScamCase, Scenario } from "../api/types";
import { EvidenceRail } from "../features/evidence/EvidenceRail";
import { InvestigationTrace } from "../features/investigation/InvestigationTrace";
import { VerdictActions } from "../features/verdict/VerdictActions";
import { MoonIcon, SearchIcon, ShieldIcon } from "../ui/Icons";

type ViewState = "idle" | "loading" | "ready" | "busy" | "error";

const SCENARIOS: Array<{ id: Scenario; label: string; hint: string }> = [
  { id: "high-risk", label: "Bank impersonation", hint: "Urgent link + identity request" },
  { id: "needs-context", label: "Unknown delivery", hint: "Not enough context" },
  { id: "low-risk", label: "Library notice", hint: "Known sender + no link" },
];

export function App() {
  const [state, setState] = useState<ViewState>("idle");
  const [scenario, setScenario] = useState<Scenario>("high-risk");
  const [activeCase, setActiveCase] = useState<ScamCase | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  async function analyze() {
    setState("loading");
    setError("");
    try {
      const message = await getDemoMessage(scenario);
      setActiveCase(await analyzeMessage(message));
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not finish");
      setState("error");
    }
  }

  async function decide(choice: "approved" | "rejected") {
    if (!activeCase) return;
    setState("busy");
    try {
      setActiveCase(await decideReport(activeCase, choice));
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report decision failed");
      setState("error");
    }
  }

  function toggleTheme() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    setDark(next);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="#main" className="wordmark"><ShieldIcon size={28} /><span><strong>ScamShield</strong><small>Protecting you, locally.</small></span></a>
        <span className="case-id">{activeCase ? `Case ${activeCase.id.replace("case-", "SS-").toUpperCase()}` : "New investigation"}</span>
        <span className="local-badge"><ShieldIcon />Local demo · nothing sent</span>
        <button type="button" className="theme-action" aria-label={`Switch to ${dark ? "light" : "dark"} theme`} onClick={toggleTheme}><MoonIcon /></button>
      </header>

      {error && <div className="error-banner" role="alert"><strong>Analysis stopped safely.</strong><span>{error}</span><button type="button" onClick={analyze}>Try again</button></div>}

      {state === "loading" ? (
        <main id="main" className="loading-case" aria-live="polite" aria-busy="true"><SearchIcon size={34} /><h1>Checking the message locally</h1><p>Redacting sensitive fields, extracting claims and running offline checks.</p><div className="scan-lines" aria-hidden="true"><span /><span /><span /><span /></div></main>
      ) : !activeCase ? (
        <main id="main" className="intake-case">
          <section className="intake-copy"><span className="eyebrow">Evidence-first safety agent</span><h1>Pause. Check the message before it checks you.</h1><p>ScamShield separates what a message says from what local evidence supports. It never opens a suspicious link or contacts the sender.</p></section>
          <form onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
            <fieldset><legend>Choose a safe demo case</legend>{SCENARIOS.map((item) => <label key={item.id} className={scenario === item.id ? "selected" : ""}><input type="radio" name="scenario" value={item.id} checked={scenario === item.id} onChange={() => setScenario(item.id)} /><span><strong>{item.label}</strong><small>{item.hint}</small></span></label>)}</fieldset>
            <div className="intake-privacy"><ShieldIcon /><span><strong>Fictional evidence only</strong> These cases contain no real personal or financial data.</span></div>
            <button type="submit" className="primary-action"><SearchIcon />Analyze selected message</button>
          </form>
        </main>
      ) : (
        <main id="main" className="case-workspace">
          <EvidenceRail activeCase={activeCase} />
          <InvestigationTrace activeCase={activeCase} />
          <VerdictActions activeCase={activeCase} busy={state === "busy"} onDecision={decide} />
        </main>
      )}
    </div>
  );
}
