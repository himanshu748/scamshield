# Judging evidence for ScamShield

Checked September 10, 2026 using the live Devpost criteria and rules. The five criteria are equally weighted on a 1–5 scale. This is our evidence map, not a prediction of the judges' score. [Official rules](https://agentsforhumans.devpost.com/rules)

## Audience and job

People reviewing suspicious messages with a trusted family member or community helper.

A suspicious message often reaches a helper without enough context. Forwarding the entire message can also spread private details or clickable suspicious links.

The intended workflow: Inspect a synthetic message without opening its links, separate warnings from unknown evidence, review the result, and choose whether to generate a redacted local handoff report.

## Evidence by criterion

| Criterion | Evidence to show | Remaining proof |
| --- | --- | --- |
| Technological Implementation | Strands receives redacted context and uses read-only message/check tools. Deterministic rules own the risk index, severity ordering, redaction and report approval. | Fresh real-model execution and free working judge access. AgentCore and a live URL can strengthen this score but are optional. |
| Design | Editable intake, three outcome states, visible unknowns, saved cases and report preview support a review without contacting a sender. | Record intake through final artifact, including an error or uncertain state. |
| Potential Impact | Demonstrate a person handing the reviewed report to a helper. This is an individual-to-helper workflow, not evidence of a deployed community inbox or real fraud reduction. | User feedback or observed task timings would strengthen the claim; neither has been measured here. |
| Creativity & Originality | The design preserves uncertainty and provenance in the handoff. It avoids treating model confidence, a familiar sender name or a low rule score as proof of safety. | Explain the domain tradeoff with a concrete difficult example. |
| Presentation | A timed script in DEMO_SCRIPT.md connects audience, problem, decisions and output. | Public YouTube/Vimeo video no longer than five minutes. |

Track: **Good Neighbor Agents**. Rule-based guidance, not a calibrated fraud probability. No live domain reputation or authenticated sender checks, shared community inbox, or automatic reporting.

## Difficult case and useful output

Show a message with too little evidence, and a high-risk message even when the user asserts sender confirmation. Warnings must remain visible.

Open the Markdown report, inspect unresolved evidence and privacy warnings, and show that generating it did not send it to anyone.

## Current verification

- Automated checks: 104 backend + 32 frontend tests, with the frontend production build passing.
- The workspace's Connection details panel makes only a local health request. It distinguishes scripted responses from configured external/Bedrock/AgentCore inference; it never claims that configuration proves access.
- Unknown runtime configurations and failed health requests are labeled, not interpreted as success.
- Real Qwen evidence is dated September 9 in QWEN-VERIFICATION.md. The owner subsequently stopped the endpoint. No new inference is established by offline tests.
- RELEASE-CHECKLIST.md tracks architecture, public repository, video, Builder ID, eligibility, judge access and final submission separately.

## Bonus plan and release boundary

Optional public builder.aws posts can add 0.2 points each, up to 0.6. Drafts are not bonus proof. Describe the actual Strands implementation and provider boundary; do not claim AWS hosting or AgentCore deployment.

Before submission, provide the public video and free working access through judging, confirm the entrant's Builder ID and eligibility, review the official rules, and verify the Devpost receipt. Do not replace those steps with a test count.
