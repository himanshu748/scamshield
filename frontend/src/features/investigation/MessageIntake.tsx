import { useEffect, useRef, useState } from "react";
import type { MessageRequest } from "../../api/types";
import { previewMessage } from "../../api/client";
import "./privacy-preview.css";

export function MessageIntake({ onAnalyze, initial }: { onAnalyze: (request: MessageRequest) => void; initial?: MessageRequest | null }) {
  const [content, setContent] = useState(initial?.content || "");
  const [confirmed, setConfirmed] = useState(initial?.sender_confirmed || false);
  const [sender, setSender] = useState(initial?.sender || "");
  const [channel, setChannel] = useState<MessageRequest["channel"]>(initial?.channel || "sms");
  const [preview, setPreview] = useState<MessageRequest | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const version = useRef(0);
  const previewRegion = useRef<HTMLElement>(null);
  useEffect(() => {
    version.current += 1;
    setPreview(null); setPreviewError(""); setPreviewing(false);
    return () => { version.current += 1; };
  }, [content, sender, channel, confirmed]);
  useEffect(() => { if (preview) previewRegion.current?.focus(); }, [preview]);
  async function showPreview() {
    const activeVersion = ++version.current;
    setPreviewing(true); setPreviewError(""); setPreview(null);
    try {
      const result = await previewMessage({ content: content.trim(), sender: sender.trim() || "Unknown sender", channel, sender_confirmed: confirmed, received_at: new Date().toISOString() });
      if (activeVersion === version.current) setPreview(result);
    } catch (error) {
      if (activeVersion === version.current) setPreviewError(error instanceof Error ? error.message : "Preview unavailable. Edit out sensitive details before checking the message.");
    } finally { if (activeVersion === version.current) setPreviewing(false); }
  }
  return <form className="message-input-form" onSubmit={e => { e.preventDefault(); onAnalyze({ content: content.trim(), sender: sender.trim() || "Unknown sender", channel, sender_confirmed: confirmed, received_at: new Date().toISOString() }); }}>
    <div className="message-form-heading"><h2>Review a message</h2><span>No links opened</span></div>
    <div className="source-fields"><div><label htmlFor="message-channel">Message type</label><select id="message-channel" value={channel} onChange={e => setChannel(e.target.value as MessageRequest["channel"])}><option value="sms">SMS</option><option value="email">Email</option><option value="chat">Chat</option></select></div>
    <div><label htmlFor="message-sender">Sender (optional)</label><input id="message-sender" maxLength={160} autoComplete="off" value={sender} onChange={e => setSender(e.target.value)} placeholder="Displayed name, number or email" /></div></div>
    <div className="message-field"><label htmlFor="message-content">Message to check</label><textarea id="message-content" required maxLength={10000} rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder="Paste the message here. Do not open its links." aria-describedby="message-privacy message-character-count" />
    <div className="message-composer-footer"><span id="message-character-count">{content.length.toLocaleString()} / 10,000 characters</span><button type="button" disabled={!content} onClick={() => setContent("")}>Clear text</button></div></div>
    <label className="sender-confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I independently confirmed who sent this message.</label>
    <div className="message-review-actions"><button type="button" className="preview-action" onClick={() => void showPreview()} disabled={!content.trim() || previewing}>{previewing ? "Preparing preview…" : "Preview what AI will see"}</button><button type="submit" className="primary-action" disabled={!content.trim() || previewing}>Check message</button></div>
    {previewError && <p role="alert">{previewError}</p>}
    {preview && <section ref={previewRegion} className="privacy-preview" tabIndex={-1} aria-labelledby="privacy-preview-title">
      <div className="privacy-preview-heading"><h3 id="privacy-preview-title">Review before sharing with AI</h3><span>No AI request used</span></div>
      <p>This is the masked message data used for model advice. Previewing sends your input to this app’s server for masking, but does not save a case or contact the model.</p>
      <dl><div><dt>Sender</dt><dd>{preview.sender}</dd></div><div><dt>Context</dt><dd>{preview.channel.toUpperCase()} · {preview.sender_confirmed ? "You confirmed the sender" : "Sender not independently confirmed"}</dd></div></dl>
      <pre aria-label="Masked message preview">{preview.content}</pre>
      <p className="preview-caution">Redaction can miss details. Names and message wording may remain. Edit the original above if anything here should not be shared; editing clears this preview.</p>
    </section>}
    <p id="message-privacy">Checks run locally. If model advice is enabled, redacted text is sent to the configured model provider. Detected personal details are masked before storage, but automated redaction may miss them. Remove passwords, payment details and anything you do not want shared or retained.</p>
  </form>;
}
