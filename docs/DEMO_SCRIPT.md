# ScamShield demo video outline

Status: recording and public upload pending. The final video must be public on YouTube or Vimeo and at most five minutes.

Recording update, September 10: real Qwen3-8B tool workflows were verified on Modal
on September 9. The endpoint is deliberately stopped. Resume it only with approval,
warm it, and record fresh execution. When recording Qwen, identify Qwen + Strands
accurately rather than reading any older fixture-only narration below. When using
the free scripted demo, label it scripted throughout. Use architecture-current.png.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:25 | Message intake | A person brings a suspicious message to a trusted community helper. Present this as the intended handoff, not claimed group adoption or a shared inbox. |
| 0:25–0:50 | Paste a fictional email | Include a pressure phrase, a credential request and an example.invalid URL. State the example is synthetic. No links are visited. |
| 0:50–1:45 | Run the application and inspect evidence | Deterministic checks + three-state risk score; show where the source evidence comes from |
| 1:45–2:30 | Unknown evidence, then approve report | A sender-confirmation checkbox is the user's assertion, not authentication. Show that warnings remain prominent despite that assertion. |
| 2:30–3:15 | Download and open Markdown report | Show every check/source, separate unknowns, safety steps and timestamp provenance. Original message/sender are omitted; review for missed details before sharing. Nothing is sent automatically. |
| 3:15–3:45 | Architecture + Strands boundary | Advice supplies explanation and ordering within severity groups. Deterministic checks own the risk index. Label scripted SDK execution; do not call it live model inference. |
| 3:45–4:15 | Reopen saved case and explain limits | The rule index is not a fraud probability. There is no reputation lookup, authenticated sender check or shared community inbox. |

Do not show an AgentCore deployment or live Nova response until one has been verified. Mention Codex and Claude as development assistants. Keep AWS console credentials, account tokens, personal data and private browser tabs out of the recording.

Required publication: attach the public YouTube/Vimeo URL to the Devpost project, then watch the entire uploaded video to verify audio/text readability and duration.
