import { useState } from "react";
import { ContextIcon, FileIcon, ShieldIcon } from "../../ui/Icons";

const SIGNALS = [
  { label: "Time pressure", title: "A deadline that pressures you", body: "“30 minutes” makes a decision feel urgent. Pause and check independently.", next: "Open the service’s app yourself. Do not let the message set your deadline." },
  { label: "Identity request", title: "Who is asking for your details?", body: "“Verify your identity” asks for sensitive information without establishing the sender.", next: "Use contact details you already trust. Do not send identity details in reply." },
  { label: "Unverified link", title: "A link is not proof of identity", body: "The example domain does not establish a relationship with your account provider. It remains plain text here.", next: "Type the known service address yourself. This preview never visits a link." },
];

export function InteractivePreview() {
  const [signal, setSignal] = useState(0);
  const current = SIGNALS[signal];
  return (
    <aside className="message-preview interactive-preview" aria-label="Illustrative message check">
      <div className="message-preview-caption"><FileIcon /><span>Illustrative preview · fictional message</span></div>
      <div className="message-paper">
        <p className="message-origin">SMS <span>Sender identity unverified</span></p>
        <blockquote>“Your account will close in <mark className={signal === 0 ? "selected-signal" : ""}>30 minutes</mark>. <mark className={signal === 1 ? "selected-signal" : ""}>Verify your identity</mark> at <mark className={signal === 2 ? "selected-signal" : ""}>account-check.example</mark>.”</blockquote>
        <p className="message-link-note"><ShieldIcon />Link shown as text. Never opened.</p>
      </div>
      <div className="signal-explorer">
        <p>Choose a warning sign to inspect</p>
        <div className="signal-controls" role="group" aria-label="Inspect warning signs">
          {SIGNALS.map((item, index) => <button key={item.label} type="button" aria-pressed={signal === index} aria-controls="signal-explanation" onClick={() => setSignal(index)}>{item.label}</button>)}
        </div>
        <div id="signal-explanation" className="signal-explanation" aria-live="polite" aria-atomic="true">
          <div key={signal}><h3>{current.title}</h3><p>{current.body}</p></div>
        </div>
      </div>
      <details className="message-next"><summary>What should I do next?</summary><p>{current.next} These are reasons to investigate, not proof on their own.</p></details>
      <div className="message-preview-footer"><ContextIcon /><span>Evidence to consider. No automatic report.</span></div>
    </aside>
  );
}
