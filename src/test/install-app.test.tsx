import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallAppButton } from "@/components/InstallAppButton";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function offerInstall(outcome: "accepted" | "dismissed" = "accepted") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: "web" }) });
  fireEvent(window, event);
  return { prompt, event };
}

describe("Netinho home-screen installation", () => {
  it("offers the available browser installation without submitting the login form", async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={submit}><InstallAppButton /></form>);
    const { prompt, event } = offerInstall();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(event.defaultPrevented).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens manual home-screen instructions when installation is unavailable", () => {
    render(<InstallAppButton />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not reuse a consumed browser installation event", async () => {
    render(<InstallAppButton />);
    const { prompt } = offerInstall();
    const button = screen.getByRole("button");
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("falls back to manual instructions if the browser refuses the prompt", async () => {
    render(<InstallAppButton />);
    const { prompt } = offerInstall();
    prompt.mockRejectedValueOnce(new Error("Unavailable"));
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("handles dismissal and then an installation completion event", async () => {
    render(<InstallAppButton />);
    offerInstall("dismissed");
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("dialog")).toBeVisible();
    fireEvent(window, new Event("appinstalled"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});