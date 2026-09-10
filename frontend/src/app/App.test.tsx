import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import type { ScamCase } from "../api/types";

it("restores a failed custom request and allows correcting it", async () => {
  window.location.hash = "";
  const fetcher = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Temporary failure" }), { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(caseFixture), { status: 201 }));
  render(<App />);
  fireEvent.change(screen.getByLabelText("Message type"), { target: { value: "email" } });
  fireEvent.change(screen.getByLabelText("Sender (optional)"), { target: { value: "My sender" } });
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Original message" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /independently confirmed/ }));
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  expect(await screen.findByLabelText("Message to check")).toHaveValue("Original message");
  expect(screen.getByLabelText("Sender (optional)")).toHaveValue("My sender");
  expect(screen.getByLabelText("Message type")).toHaveValue("email");
  expect(screen.getByRole("checkbox", { name: /independently confirmed/ })).toBeChecked();
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Corrected message" } });
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  await screen.findByText("Checked evidence");
  expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({ content: "Corrected message", sender: "My sender", channel: "email", sender_confirmed: true });
});

it("retries a failed delete without analyzing another message", async () => {
  window.location.hash = "";
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const fetcher = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify([caseFixture]), { status: 200 }))
    .mockResolvedValueOnce(new Response("{}", { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ deleted: true }), { status: 200 }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Saved cases" }));
  fireEvent.click(await screen.findByRole("button", { name: "case-demo: high risk" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete case" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry request" }));
  await screen.findByLabelText("Message to check");
  expect(fetcher.mock.calls.map(call => [call[0], call[1]?.method || "GET"])).toEqual([
    ["/api/cases", "GET"], ["/api/cases/case-demo", "DELETE"], ["/api/cases/case-demo", "DELETE"]
  ]);
});

it("does not reopen history when a closed request finishes late", async () => {
  window.location.hash = "";
  let finish!: (value: Response) => void;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Saved cases" }));
  expect(screen.getByText("Loading saved cases…")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close saved cases" }));
  finish(new Response(JSON.stringify([caseFixture]), { status: 200 }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Saved cases" })).not.toBeInTheDocument());
  expect(screen.getByLabelText("Message to check")).toBeInTheDocument();
});

it("prevents switching cases or duplicating a mutation while review is pending", async () => {
  window.location.hash = "";
  let finish!: (value: Response) => void;
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<App />);
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Review this message" } });
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  expect(screen.getByRole("button", { name: "New message" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Saved cases" })).toBeDisabled();
  finish(new Response(JSON.stringify(caseFixture), { status: 201 }));
  await screen.findByText("Checked evidence");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("allows local analysis when the browser reports no internet", async () => {
  window.location.hash = "";
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(caseFixture), { status: 201 }));
  render(<App />);
  expect(screen.getByText("Internet unavailable.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Local-only review" } });
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  await screen.findByText("Checked evidence");
});

it("places safer actions before the detailed trace in reading and keyboard order", async () => {
  window.location.hash = "";
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(caseFixture), { status: 201 }));
  render(<App />);
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Review this message" } });
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  const actions = await screen.findByRole("complementary", { name: "Verdict and safer actions" });
  const trace = screen.getByRole("region", { name: "Investigation trace" });
  expect(actions.compareDocumentPosition(trace) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Verdict & actions", level: 2 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Checked evidence", level: 3 })).toBeInTheDocument();
});

it("filters saved cases by redacted text and assessment", async () => {
  window.location.hash = "";
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([
    caseFixture,
    { ...caseFixture, id: "case-library", redacted_sender: "Library", redacted_content: "Your book is due", assessment: { ...caseFixture.assessment, level: "needs_context" } },
  ]), { status: 200 }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Saved cases" }));
  fireEvent.change(await screen.findByLabelText("Find a case"), { target: { value: "book" } });
  expect(screen.getByRole("button", { name: "case-library: needs context" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "case-demo: high risk" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Assessment"), { target: { value: "high_risk" } });
  expect(screen.getByText(/No cases match these filters/)).toBeInTheDocument();
});


const message = { channel: "sms", sender: "+1 833 555 0198", content: "URGENT verify at https://fake.test", received_at: "2026-09-03T09:42:00Z" } as const;
const caseFixture: ScamCase = {
  id: "case-demo",
  status: "waiting_for_approval",
  approval_id: "generate-local-report",
  request: message,
  redacted_sender: "+• ••• ••• ••98",
  redacted_content: "URGENT verify at https://fake.test",
  claims: [{ id: "claim-url-1", kind: "url", text: "https://fake.test", provenance: "Message link" }],
  checks: [
    { id: "check-domain-1", label: "Domain identity", finding: "fake.test is not official", source: "Offline allow-list", result: "risky" },
    { id: "check-pressure", label: "Pressure pattern", finding: "Urgency found", source: "Local rules", result: "risky" },
  ],
  assessment: { level: "high_risk", score: 86, confidence: "high", reasons: ["Unofficial domain", "Urgency found"], safety_steps: ["Do not click the link."] },
  advice: { summary: "Evidence remains visible.", prioritized_check_ids: ["check-domain-1"] },
  events: [],
  report: null,
};

beforeEach(() => { window.location.hash = "#overview"; });

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.removeItem("scamshield-theme");
  delete document.documentElement.dataset.theme;
});

function mockFetch() {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(JSON.stringify(message), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(caseFixture), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ...caseFixture, status: "report_generated", report: "# Local report" }), { status: 200 }));
}

function openDemo() {
  render(<App />);
  fireEvent.click(screen.getAllByRole("button", { name: "Check a message" })[0]);
  fireEvent.click(screen.getByText("Explore example messages"));
}

describe("ScamShield landing", () => {
  it("opens on the landing page with navigation and a primary call to action", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "ScamShield" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Take a breath before you answer/ })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Section navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How it checks" })).toHaveAttribute("href", "#stages-title");
    expect(screen.getAllByRole("button", { name: "Check a message" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Bank impersonation")).not.toBeInTheDocument();
  });

  it("states the privacy and safety boundaries without claiming a deployment", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "How the agent works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it will not do" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No automatic reporting" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Links are never opened" })).toBeInTheDocument();
    expect(screen.getByText(/AgentCore hosting is configured separately/)).toBeInTheDocument();
    expect(screen.getByText(/Runs entirely on your machine in fixture mode/)).toBeInTheDocument();
  });

  it("moves between the landing page and the demo", () => {
    openDemo();
    expect(screen.getByText("Bank impersonation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to overview" }));
    expect(screen.getByRole("heading", { name: /Take a breath before you answer/ })).toBeInTheDocument();
  });
});

describe("ScamShield", () => {
  it("shows all safe demo scenarios before analysis", () => {
    openDemo();
    expect(screen.getByText("Bank impersonation")).toBeInTheDocument();
    expect(screen.getByText("Unknown delivery")).toBeInTheDocument();
    expect(screen.getByText("Library notice")).toBeInTheDocument();
  });

  it("separates evidence, checks and verdict", async () => {
    mockFetch();
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Analyze selected message" }));
    expect(await screen.findByText("Extracted claims")).toBeInTheDocument();
    expect(screen.getByText("Checked evidence")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "High risk" })).toBeInTheDocument();
    expect(screen.getByText("Links opened")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getAllByRole("cell")).toHaveLength(3);
  });

  it("keeps every check source in the document so narrow layouts cannot drop evidence", async () => {
    mockFetch();
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Analyze selected message" }));
    await screen.findByText("Checked evidence");

    expect(screen.getByText("Offline allow-list")).toBeInTheDocument();
    expect(screen.getByText("Local rules")).toBeInTheDocument();
  });

  it("persists an explicit theme choice", () => {
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(window.localStorage.getItem("scamshield-theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("creates a report only after the explicit approval control", async () => {
    mockFetch();
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Analyze selected message" }));
    await screen.findByRole("button", { name: "Generate local report" });
    expect(screen.queryByText("Local report ready")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate local report" }));
    await waitFor(() => expect(screen.getByText("Local report ready")).toBeInTheDocument());
    const calls = vi.mocked(fetch).mock.calls;
    expect(JSON.parse(String(calls[2][1]?.body))).toEqual({ approval_id: "generate-local-report", choice: "approved" });
  });
});
