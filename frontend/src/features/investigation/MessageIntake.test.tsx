import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MessageIntake } from "./MessageIntake";

it("checks custom text without opening links or fetching sample content", () => {
  const onAnalyze = vi.fn();
  render(<MessageIntake onAnalyze={onAnalyze} />);
  expect(screen.getByRole("button", { name: "Check message" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Message to check"), { target: { value: "Verify now at https://suspicious.example" } });
  fireEvent.click(screen.getByRole("button", { name: "Check message" }));
  expect(onAnalyze).toHaveBeenCalledWith(expect.objectContaining({ content: "Verify now at https://suspicious.example", sender: "Unknown sender", channel: "sms" }));
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
