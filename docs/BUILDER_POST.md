# Agents for Humans: building ScamShield with Strands and a local evidence trail

Scam messages use urgency to shorten the time someone spends thinking. A message says an account will close, a delivery is waiting, or a payment needs immediate verification. Checking it can itself become risky if the first action is to open the link or forward personal details.

ScamShield creates a pause. It is a local evidence-review prototype that could be used by people helping neighbours or community members assess suspicious messages. It currently handles individual cases; it does not claim a shared community inbox or notification network.

## Keep evidence separate from explanation

The workflow redacts phone numbers, email addresses and account identifiers before persistence or model reasoning. The source message is examined locally for claims and deterministic evidence checks. Suspicious URLs are parsed as text; they are never visited.

The result is one of three states: high risk, needs context or low risk. Each state includes visible reasons and uncertainty. It is guidance based on the checks implemented, not a guarantee that a sender is safe or malicious.

Strands Agents SDK contributes an explanation and check ordering through typed AgentAdvice. Deterministic application code owns redaction, risk scoring and report approval. The registered agent tools can inspect evidence but cannot send messages or create a report.

## A real SDK loop in the free demo

The three fictional demonstration messages cover different outcomes: bank impersonation, an ambiguous delivery message and a routine library reminder.

The offline model provider is explicitly scripted. It runs through the real Strands Agent tool loop and structured-output validation, allowing the application to demonstrate orchestration without paying for inference. Tests verify that the evidence tool actually executes.

The optional live provider uses Amazon Bedrock Nova Micro. Each independent request gets fresh conversation history, a maximum of eight model calls and a 512-token output cap per call.

## What goes to AgentCore

The optional AgentCore advisor receives a redacted message. The local client applies redaction before the request leaves the machine, and the runtime validates and redacts its input again before invoking Strands. The resulting advice returns to the local workflow.

The service follows AgentCore's HTTP contract with /ping and /invocations endpoints and Linux ARM64 dependencies. Deployment uses private S3 code storage, a scoped IAM execution role and AWS SDK request signing. A short session lifetime and explicit session stop keep the demo's compute usage bounded.

This path is implemented and locally tested. It is not yet a verified cloud deployment: S3 returned NotSignedUp during the attempt, and the alternative AWS project login had expired.

## A report still needs approval

The local report is generated only after the user approves the exact report action. Rejecting the action creates no report. The application stores redacted case content in SQLite and does not transmit reports or notifications.

The API tests check the zero-before, one-after report invariant, along with the redaction rules and three risk outcomes. The interface exposes the evidence sources on mobile as well as desktop so that a narrow screen does not remove the basis of the assessment.

## What comes next

A stronger community version would need testing with volunteers and the people they support, a carefully designed shared workflow, and explicit consent around sharing. Those are future work, not completed capabilities.

For this prototype, the demonstration is concrete: review a fictional message, inspect its claims and checks, compare uncertainty across scenarios, and approve or reject a local report. The goal is to make a careful decision easier without adding another channel through which sensitive data escapes.

Codex and Claude assisted development and review. The public repository contains the implementation, tests, architecture attachment and current verification record.

Source: https://github.com/himanshu748/scamshield
