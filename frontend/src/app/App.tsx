import { useEffect, useRef, useState } from "react";
import { useSurfaceNavigation } from "./useSurfaceNavigation";
import { ConnectionDetails } from "../features/connection/ConnectionDetails";

import { analyzeMessage, decideReport, getDemoMessage, listCases, removeCase } from "../api/client";
import type { MessageRequest, ScamCase, Scenario } from "../api/types";
import { EvidenceRail } from "../features/evidence/EvidenceRail";
import { Landing } from "../features/landing/Landing";
import { InvestigationTrace } from "../features/investigation/InvestigationTrace";
import { VerdictActions } from "../features/verdict/VerdictActions";
import { MoonIcon, SearchIcon, ShieldIcon } from "../ui/Icons";
import { applyTheme, getInitialTheme, type Theme } from "../ui/theme";

import { MessageIntake } from "../features/investigation/MessageIntake";
import { SavedCases } from "../features/investigation/SavedCases";

type ViewState = "idle" | "loading" | "ready" | "busy" | "error";

const SCENARIOS: Array<{ id: Scenario; label: string; hint: string }> = [
  { id: "high-risk", label: "Bank impersonation", hint: "Urgent link + identity request" },
  { id: "needs-context", label: "Unknown delivery", hint: "Not enough context" },
  { id: "low-risk", label: "Library notice", hint: "Known sender + no link" },
];

export function App() {
  const storageLabel = import.meta.env.VITE_HOSTED === "true" ? "Private server case storage" : "Local case storage";
  const tagline = import.meta.env.VITE_HOSTED === "true" ? "Check before you respond." : "Protecting you, locally.";
  const { surface, openSurface } = useSurfaceNavigation();
  const [state, setState] = useState<ViewState>("idle");
  const [scenario, setScenario] = useState<Scenario>("high-risk");
  const [activeCase, setActiveCase] = useState<ScamCase | null>(null);
  const pendingRequest = useRef<MessageRequest | null>(null);
  const mutationPending = useRef(false);
  const historyRequest = useRef(0);
  const [retryChoice, setRetryChoice] = useState<"approved" | "rejected" | null>(null);
  const [saved, setSaved] = useState<ScamCase[] | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [utilityError, setUtilityError] = useState<{ message: string; retry: () => void } | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const busy = state === "loading" || state === "busy" || deleting;

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  async function analyze(custom?: MessageRequest) {
    if (mutationPending.current) return;
    if (custom) pendingRequest.current = custom;
    mutationPending.current = true;
    setRetryChoice(null);
    setState("loading");
    setError("");
    try {
      const message = pendingRequest.current || await getDemoMessage(scenario);
      setActiveCase(await analyzeMessage(message));
      pendingRequest.current = null;
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not finish");
      setState("error");
    } finally {
      mutationPending.current = false;
    }
  }

  async function decide(choice: "approved" | "rejected") {
    if (!activeCase || mutationPending.current) return;
    mutationPending.current = true;
    setRetryChoice(choice);
    setState("busy");
    setError("");
    try {
      setActiveCase(await decideReport(activeCase, choice));
      setRetryChoice(null);
      setState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The report decision failed");
      setState("error");
    } finally {
      mutationPending.current = false;
    }
  }

  async function loadSaved() {
    if (mutationPending.current || savedLoading) return;
    const requestId = ++historyRequest.current;
    setUtilityError(null);
    setSavedLoading(true);
    setSaved([]);
    try {
      const cases = await listCases();
      if (requestId === historyRequest.current) setSaved(cases);
    } catch {
      if (requestId === historyRequest.current) {
        setSaved(null);
        setUtilityError({ message: "Saved cases unavailable. Check the local service and try again.", retry: () => void loadSaved() });
      }
    } finally {
      if (requestId === historyRequest.current) setSavedLoading(false);
    }
  }
  async function deleteCase() {
    if (!activeCase || mutationPending.current || !window.confirm("Delete this saved case and its report from local storage?")) return;
    mutationPending.current = true;
    setDeleting(true);
    setUtilityError(null);
    try {
      await removeCase(activeCase.id);
      setActiveCase(null); setSaved(null); setState("idle"); setError(""); setRetryChoice(null);
    } catch {
      setUtilityError({ message: "Could not delete the case. Try again.", retry: () => void deleteCase() });
    } finally {
      mutationPending.current = false;
      setDeleting(false);
    }
  }

  function closeHistory() { ++historyRequest.current; setSaved(null); setSavedLoading(false); }
  function toggleTheme() {
    setTheme((current) => current === "light" ? "dark" : "light");
  }

  if (surface === "landing") {
    return (
      <div className="app-shell">
        <header className="topbar landing-topbar">
          <a href="#overview" onClick={(event) => { event.preventDefault(); openSurface("landing"); }} className="wordmark"><ShieldIcon size={28} /><span><h1>ScamShield</h1><small>{tagline}</small></span></a>
          <nav className="landing-nav" aria-label="Section navigation">
            <a href="#stages-title">How it checks</a>
            <a href="#architecture-title">Architecture</a>
            <a href="#boundaries-title">Boundaries</a>
          </nav>
          <button type="button" className="nav-action" onClick={() => openSurface("demo")}>Check a message</button>
          <button type="button" className="theme-action" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme}><MoonIcon /></button>
        </header>
        <Landing onStart={() => openSurface("demo")} />
      </div>
    );
  }

  return (
    <div className="app-shell scamshield-workspace">
      <header className="topbar">
        <a href="#overview" onClick={(event) => { event.preventDefault(); openSurface("landing"); }} className="wordmark"><ShieldIcon size={28} /><span><h1>ScamShield</h1><small>{tagline}</small></span></a>
        <span className="case-id">{activeCase ? `Case ${activeCase.id.replace("case-", "SS-").toUpperCase()}` : "New investigation"}</span>
        <span className="local-badge"><ShieldIcon />{storageLabel}</span>
        <button type="button" className="nav-action subtle" disabled={busy} onClick={() => openSurface("landing")}>Back to overview</button>
        <button type="button" className="theme-action" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={toggleTheme}><MoonIcon /></button>
      </header>

      <div className="workspace-tools"><span>Message review <small>Local checks · Review before reporting</small></span><button type="button" disabled={busy} onClick={() => { closeHistory(); setActiveCase(null); setError(""); setUtilityError(null); setRetryChoice(null); pendingRequest.current = null; setState("idle"); }}>New message</button><button type="button" disabled={busy || savedLoading} onClick={loadSaved}>{savedLoading ? "Loading cases…" : "Saved cases"}</button>{activeCase && <button type="button" disabled={busy} onClick={deleteCase}>{deleting ? "Deleting…" : "Delete case"}</button>}</div>
      <ConnectionDetails />
      {utilityError && <div className="error-banner" role="alert"><span>{utilityError.message}</span><button type="button" onClick={utilityError.retry}>Retry request</button><button type="button" onClick={() => setUtilityError(null)}>Dismiss</button></div>}
      {saved && <SavedCases cases={saved} loading={savedLoading} busy={busy} onClose={closeHistory} onOpen={item => { if (mutationPending.current) return; setActiveCase(item); closeHistory(); setError(""); setUtilityError(null); setRetryChoice(null); pendingRequest.current = null; setState("ready"); }} />}
      {!online && <div className="offline-banner" role="status"><ShieldIcon /><span><strong>Internet unavailable.</strong> Local message checks can still run while this device’s service is running.</span></div>}
      {error && <div className="error-banner" role="alert"><strong>Request could not finish.</strong><span>{error}</span><button type="button" disabled={busy} onClick={() => retryChoice ? void decide(retryChoice) : void analyze()}>Try again</button></div>}

      {state === "loading" ? (
        <main id="main" className="loading-case" aria-live="polite" aria-busy="true"><SearchIcon size={34} /><h1>Checking the message</h1><p>Redacting sensitive fields, evaluating local checks and preparing advice.</p><div className="scan-lines" aria-hidden="true"><span /><span /><span /><span /></div></main>
      ) : !activeCase ? (
        <><main id="main" className="intake-case">
          <section className="intake-copy"><h1>Check before you respond.</h1><p>Bring the message that concerns you. Inspect the warning signs, missing context and safer next steps without visiting its links.</p><dl className="intake-boundaries"><div><dt>Observe, don’t interact</dt><dd>Links are read as text. Their destinations are never visited.</dd></div><div><dt>See what is still unknown</dt><dd>A familiar sender name is not proof of identity.</dd></div><div><dt>Keep control of the record</dt><dd>Review redacted evidence, choose a report, or delete the case.</dd></div></dl><p className="intake-limits">Risk checks use local rules; optional model advice depends on server configuration. A low-risk result is not a safety guarantee.</p></section>
          <MessageIntake initial={pendingRequest.current} onAnalyze={request => void analyze(request)} />
        </main><details className="sample-messages"><summary>Explore example messages</summary>          <form onSubmit={(event) => { event.preventDefault(); pendingRequest.current = null; void analyze(); }}>
            <fieldset><legend>Choose a safe demo case</legend>{SCENARIOS.map((item) => <label key={item.id} className={scenario === item.id ? "selected" : ""}><input type="radio" name="scenario" value={item.id} checked={scenario === item.id} onChange={() => setScenario(item.id)} /><span><strong>{item.label}</strong><small>{item.hint}</small></span></label>)}</fieldset>
            <div className="intake-privacy"><ShieldIcon /><span><strong>Fictional evidence only</strong> These cases contain no real personal or financial data.</span></div>
            <button type="submit" className="primary-action"><SearchIcon />Analyze selected message</button>
          </form></details></>
      ) : (
        <><section className={`case-summary ${activeCase.assessment.level}`} aria-label="Case overview"><div><h2>{activeCase.assessment.level === "high_risk" ? "Pause before taking action." : activeCase.assessment.level === "needs_context" ? "Verify through another channel." : "No strong warning signs found."}</h2><p>{activeCase.redacted_sender} · {activeCase.request.channel.toUpperCase()}</p></div><div className="case-summary-evidence"><span><strong>{activeCase.checks.filter(check => check.result === "risky").length}</strong> warning signs</span><span><strong>{activeCase.checks.filter(check => check.result === "unknown").length}</strong> unresolved checks</span><a href="#verdict-actions">View next steps</a></div></section><main id="main" className="case-workspace">
          <EvidenceRail activeCase={activeCase} />
          <VerdictActions activeCase={activeCase} busy={busy} onDecision={decide} />
          <InvestigationTrace activeCase={activeCase} />
        </main></>
      )}
    </div>
  );
}
