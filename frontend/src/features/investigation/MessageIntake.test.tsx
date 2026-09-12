import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MessageIntake } from "./MessageIntake";
import { previewMessage } from "../../api/client";
import type { MessageRequest } from "../../api/types";

vi.mock("../../api/client", () => ({ previewMessage: vi.fn() }));
afterEach(() => vi.clearAllMocks());

const masked = { content: "OTP: [redacted]", sender: "p•••@example.com", channel: "sms", sender_confirmed: false, received_at: "2027-10-07T10:00:00Z" } as MessageRequest;

it("checks custom text without opening links or fetching sample content", () => {
  const onAnalyze = vi.fn();
  render(<MessageIntake onAnalyze={onAnalyze} />);
  expect(screen.getByRole("button", { name: "Check message" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Verify now at https://suspicious.example" } });
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  expect(onAnalyze).toHaveBeenCalledWith(expect.objectContaining({ content: "Verify now at https://suspicious.example", sender: "Unknown sender", channel: "sms" }));
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("shows an inert redaction preview without analyzing or saving a case", async () => {
  vi.mocked(previewMessage).mockResolvedValue(masked);
  const onAnalyze = vi.fn();
  render(<MessageIntake onAnalyze={onAnalyze} />);
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "OTP: 839201" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview what AI will see" }));
  expect(await screen.findByLabelText("Masked message preview")).toHaveTextContent("OTP: [redacted]");
  expect(screen.getByRole("region", { name: "Review before sharing with AI" })).toHaveFocus();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(onAnalyze).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Changed message" } });
  expect(screen.queryByLabelText("Masked message preview")).not.toBeInTheDocument();
});

it("discards a slow preview if the original input has changed", async () => {
  let resolve!: (value: MessageRequest) => void;
  vi.mocked(previewMessage).mockReturnValue(new Promise(done => { resolve = done; }));
  render(<MessageIntake onAnalyze={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "First message" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview what AI will see" }));
  expect(screen.getByRole("button", { name: "Check message" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Second message" } });
  await act(async () => resolve(masked));
  expect(screen.queryByLabelText("Masked message preview")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Check message" })).toBeEnabled();
});

it("keeps the user's input and allows a retry after a preview failure", async () => {
  vi.mocked(previewMessage).mockRejectedValue(new Error("Preview unavailable"));
  render(<MessageIntake onAnalyze={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Keep my draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview what AI will see" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Preview unavailable");
  expect(screen.getByLabelText("Message to check")).toHaveValue("Keep my draft");
  expect(screen.getByRole("button", { name: "Preview what AI will see" })).toBeEnabled();
});
