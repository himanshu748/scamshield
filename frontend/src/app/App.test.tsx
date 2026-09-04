import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import type { ScamCase } from "../api/types";

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
  fireEvent.click(screen.getAllByRole("button", { name: "Try the demo" })[0]);
}

describe("ScamShield landing", () => {
  it("opens on the landing page with navigation and a primary call to action", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "ScamShield" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Take a breath before you answer/ })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Section navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How it checks" })).toHaveAttribute("href", "#stages-title");
    expect(screen.getAllByRole("button", { name: "Try the demo" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Bank impersonation")).not.toBeInTheDocument();
  });

  it("states the privacy and safety boundaries without claiming a deployment", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "How the agent works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it will not do" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nothing is transmitted" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Links are never opened" })).toBeInTheDocument();
    expect(screen.getByText(/does not claim an Amazon Bedrock\s+AgentCore deployment/)).toBeInTheDocument();
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
