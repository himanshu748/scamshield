import { useState } from "react";
import type { MessageRequest } from "../../api/types";

export function MessageIntake({ onAnalyze, initial }: { onAnalyze: (request: MessageRequest) => void; initial?: MessageRequest | null }) {
  const [content, setContent] = useState(initial?.content || "");
  const [confirmed, setConfirmed] = useState(initial?.sender_confirmed || false);
  const [sender, setSender] = useState(initial?.sender || "");
  const [channel, setChannel] = useState<MessageRequest["channel"]>(initial?.channel || "sms");
  return <form className="message-input-form" onSubmit={e => { e.preventDefault(); onAnalyze({ content: content.trim(), sender: sender.trim() || "Unknown sender", channel, sender_confirmed: confirmed, received_at: new Date().toISOString() }); }}>
    <div className="message-form-heading"><h2>Review a message</h2><span>No links opened</span></div>
    <div className="source-fields"><div><label htmlFor="message-channel">Message type</label><select id="message-channel" value={channel} onChange={e => setChannel(e.target.value as MessageRequest["channel"])}><option value="sms">SMS</option><option value="email">Email</option><option value="chat">Chat</option></select></div>
    <div><label htmlFor="message-sender">Sender (optional)</label><input id="message-sender" maxLength={160} autoComplete="off" value={sender} onChange={e => setSender(e.target.value)} placeholder="Displayed name, number or email" /></div></div>
    <div className="message-field"><label htmlFor="message-content">Message to check</label><textarea id="message-content" required maxLength={10000} rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder="Paste the message here. Do not open its links." aria-describedby="message-privacy message-character-count" />
    <div className="message-composer-footer"><span id="message-character-count">{content.length.toLocaleString()} / 10,000 characters</span><button type="button" disabled={!content} onClick={() => setContent("")}>Clear text</button></div></div>
    <label className="sender-confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I independently confirmed who sent this message.</label>
    <button type="submit" className="primary-action" disabled={!content.trim()}>Check message</button>
    <p id="message-privacy">Checks run locally. If model advice is enabled, redacted text is sent to the configured model provider. Detected personal details are masked before storage, but automated redaction may miss them. Remove passwords, payment details and anything you do not want shared or retained.</p>
  </form>;
}
