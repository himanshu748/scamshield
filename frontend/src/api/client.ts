import type { MessageRequest, ScamCase, Scenario } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Unexpected service error" }));
    throw new Error(body.detail ?? "Unexpected service error");
  }
  return response.json() as Promise<T>;
}

export function getDemoMessage(scenario: Scenario) {
  return request<MessageRequest>(`/api/demo-messages/${scenario}`);
}

export function analyzeMessage(message: MessageRequest) {
  return request<ScamCase>("/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}

export function decideReport(activeCase: ScamCase, choice: "approved" | "rejected") {
  return request<ScamCase>(`/api/cases/${activeCase.id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approval_id: activeCase.approval_id, choice }),
  });
}
