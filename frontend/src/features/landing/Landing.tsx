import { AlertIcon, CheckIcon, ContextIcon, FileIcon, SearchIcon, ShieldIcon } from "../../ui/Icons";
import { InteractivePreview } from "./InteractivePreview";

const STAGES = [
  {
    kicker: "Stage 1",
    title: "Redact before anything else",
    body: "Phone numbers, email handles and account identifiers are masked in memory before the message reaches the agent or the local database. The unredacted text is used only for deterministic checks and is never stored.",
  },
  {
    kicker: "Stage 2",
    title: "Separate the claim from the fact",
    body: "Everything the message asserts is listed as a claim with its provenance. Nothing a sender says is treated as true because they said it.",
  },
  {
    kicker: "Stage 3",
    title: "Check offline, never visit",
    body: "Suspicious links are parsed as text. No URL is opened and no sender is contacted. Checks run locally; if model advice is enabled, redacted message text goes to your configured model provider.",
  },
  {
    kicker: "Stage 4",
    title: "Say how sure it is",
    body: "The result is one of three states, high risk, needs context or low risk, with the reasons and the checks that produced it visible. Uncertainty is shown rather than rounded away.",
  },
  {
    kicker: "Stage 5",
    title: "Ask before writing anything",
    body: "A local report is generated only after you approve that exact action. Declining leaves no report behind.",
  },
];

const BOUNDARIES = [
  { title: "No automatic reporting", body: "No report or reply is sent to the sender. Fixture mode makes no external requests. Optional model advice sends redacted text to the configured provider; review it for sensitive details first." },
  { title: "Links are never opened", body: "URL handling is text parsing only. The agent cannot browse a suspicious link or reply to a sender." },
  { title: "Only redacted text is stored", body: "Redaction runs before the Strands input and before SQLite persistence, not after." },
  { title: "Guidance, not a guarantee", body: "The risk score is an assessment from visible local checks. It is presented as evidence to weigh, not a verdict to obey." },
  { title: "Fictional evidence only", body: "Every demo case contains invented data with no real personal or financial details." },
];

export function Landing({ onStart }: { onStart: () => void }) {
  const hosted = import.meta.env.VITE_HOSTED === "true";
  return (
    <main id="main" className="calm-landing">
      <section className="calm-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
        <h2 id="hero-title">Take a breath before you answer that message.</h2>
        <p className="hero-lede">
          Check a suspicious message without opening its links. ScamShield masks sensitive details,
          explains the warning signs, and shows where more context is needed.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-action" onClick={onStart}>
            <SearchIcon />Check a message
          </button>
          <a className="ghost-action" href="#stages-title">See how it checks</a>
        </div>
        <p className="hero-assurance">
          <ShieldIcon />
          <span>
            {hosted ? "AI is configured through AWS AgentCore and Groq. Redacted text is sent for advice; links are never opened. Use fictional or non-sensitive inputs." : "Runs entirely on your machine in fixture mode. No AWS account, no model spend, no network requests and nothing sent anywhere."}
          </span>
        </p>
        </div>
        <InteractivePreview />
      </section>

      <section className="calm-problem" aria-labelledby="problem-title">
        <h2 id="problem-title" className="calm-heading">Why a second opinion is hard to get</h2>
        <div className="problem-row">
          <article>
            <AlertIcon />
            <h3>Urgency is the whole attack</h3>
            <p>
              A message that says your account closes in an hour is engineered to stop you from
              checking. The pause is the defence.
            </p>
          </article>
          <article>
            <ContextIcon />
            <h3>Checking often means exposing yourself</h3>
            <p>
              Clicking the link to see where it goes, or replying to ask if it is real, is exactly
              what the sender wanted. Checking should not cost anything.
            </p>
          </article>
          <article>
            <FileIcon />
            <h3>Asking for help means handing over your data</h3>
            <p>
              Forwarding a suspicious message to a service means sharing your number, your name and
              your account details with one more stranger.
            </p>
          </article>
        </div>
      </section>

      <section className="calm-stages" aria-labelledby="stages-title">
        <h2 id="stages-title" className="calm-heading">How the agent works</h2>
        <p className="calm-lede">
          Facts, checks and inference stay in separate stages so you can see which is which. The
          model contributes an explanation and an ordering. Deterministic code owns redaction, the
          evidence checks, the score and the write boundary.
        </p>
        <ol className="stage-list">
          {STAGES.map((stage) => (
            <li key={stage.title}>
              <h3>{stage.title}</h3>
              <p className="stage-body">{stage.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="calm-architecture" aria-labelledby="architecture-title">
        <h2 id="architecture-title" className="calm-heading">What it is built on</h2>
        <div className="calm-split">
          <div className="calm-prose">
            <p>
              A FastAPI service, a SQLite case store and a React investigation workspace. The
              reasoning step uses the open-source <strong>Strands Agents SDK</strong> with typed
              structured output and read-only tools.
            </p>
            <p>
              {hosted ? "This hosted build uses Groq through AWS AgentCore. No model key is needed from you. " : "Model advice is opt-in through Amazon Bedrock or a tool-capable OpenAI-compatible endpoint. "}
              Credentials stay on the server. Each response is capped at 512 tokens; this is not a spending cap.
            </p>
            <p className="calm-caveat">
              <AlertIcon />
              <span>
                {hosted ? "Cases are stored on the server and tied to your browser session. Redacted text reaches the model provider; suspicious links are never visited. Use fictional or non-sensitive messages." : "The local build defaults to fixture mode, with no external model requests. AgentCore hosting is configured separately."}
              </span>
            </p>
          </div>
          <div className="calm-flow" aria-label="Processing path">
            <ol>
              <li><strong>React workspace</strong><span>evidence · trace · verdict</span></li>
              <li><strong>FastAPI case API</strong><span>one case lifecycle</span></li>
              <li><strong>Redaction boundary</strong><span>in memory, before anything else</span></li>
              <li><strong>Offline checks</strong><span>domain, pressure, credential, sender</span></li>
              <li><strong>Three-state assessment</strong><span>score with visible confidence</span></li>
              <li><strong>Report approval gate</strong><span>one local Markdown file</span></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="calm-boundaries" aria-labelledby="boundaries-title">
        <h2 id="boundaries-title" className="calm-heading">What it will not do</h2>
        <ul className="boundary-grid">
          {BOUNDARIES.map((item) => (
            <li key={item.title}>
              <CheckIcon />
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="calm-close" aria-labelledby="close-title">
        <h2 id="close-title">Three fictional messages. One honest answer each.</h2>
        <p>
          Try a bank impersonation, an ambiguous delivery notice and an ordinary library reminder,
          and watch the evidence change the result.
        </p>
        <button type="button" className="primary-action" onClick={onStart}>
          <SearchIcon />Check a message
        </button>
      </section>

      <footer className="calm-footer">
        <p className="footer-mark"><ShieldIcon /><span>ScamShield</span></p>
        <p className="footer-meta">
          Built for the Good Neighbor Agents track of the Agents for Humans hackathon. Apache-2.0
          licensed. ScamShield offers guidance, not a guarantee, and is not a substitute for
          contacting your bank or a trusted person directly.
        </p>
      </footer>
    </main>
  );
}
