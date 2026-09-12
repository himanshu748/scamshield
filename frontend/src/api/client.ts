import type { MessageRequest, ScamCase, Scenario } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body: { detail?: unknown; message?: unknown } = await response.json().catch(() => ({}));
      const message = typeof body.detail === "string" ? body.detail
        : typeof body.message === "string" ? body.message
        : response.status === 422 ? "Check the message fields and try again."
        : "The local service could not complete this request. Please try again.";
      throw new Error(message);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The local service took too long. Check saved cases before retrying; your request may have completed.");
    }
    if (error instanceof TypeError) throw new Error("Cannot reach the local service. Check that it is running and try again.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const listCases = () => request<ScamCase[]>("/api/cases");
export const previewMessage = (message: MessageRequest) => request<MessageRequest>("/api/messages/preview", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message),
});
export const removeCase = (id: string) => request<{ deleted: boolean }>(`/api/cases/${encodeURIComponent(id)}`, { method: "DELETE" });

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
