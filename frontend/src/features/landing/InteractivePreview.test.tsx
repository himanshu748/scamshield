import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InteractivePreview } from "./InteractivePreview";

describe("Interactive message preview", () => {
  it("connects each control to its matching text and explanation", () => {
    render(<InteractivePreview />);
    fireEvent.click(screen.getByRole("button", { name: "Identity request" }));
    expect(screen.getByText("Verify your identity")).toHaveClass("selected-signal");
    expect(screen.getByText("30 minutes")).not.toHaveClass("selected-signal");
    expect(screen.getByRole("heading", { name: "Who is asking for your details?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unverified link" }));
    expect(screen.getByText("account-check.example")).toHaveClass("selected-signal");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("keeps next-step advice in sync without opening a link", () => {
    render(<InteractivePreview />);
    fireEvent.click(screen.getByText("What should I do next?"));
    fireEvent.click(screen.getByRole("button", { name: "Unverified link" }));
    expect(screen.getByText(/Type the known service address yourself/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Time pressure" }));
    expect(screen.getByText(/Do not let the message set your deadline/)).toBeVisible();
  });
});
