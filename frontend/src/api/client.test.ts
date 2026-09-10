import { afterEach, expect, it, vi } from "vitest";
import { analyzeMessage, listCases } from "./client";

afterEach(() => vi.restoreAllMocks());

it("does not render validation objects or echoed user content as errors", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: [{ msg: "Invalid", input: "private-message" }] }), { status: 422 }));
  await expect(analyzeMessage({ sender: "Sender", content: "Message", channel: "sms", received_at: "2026-09-08T10:00:00Z" })).rejects.toThrow("Check the message fields and try again.");
});

it("explains how to recover when the service cannot be reached", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(listCases()).rejects.toThrow("Cannot reach the local service");
});
