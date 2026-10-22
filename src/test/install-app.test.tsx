import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallAppButton } from "@/components/InstallAppButton";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
import { toast } from "sonner";

let appended: HTMLAnchorElement[] = [];
const appendOriginal = document.body.appendChild.bind(document.body);

beforeEach(() => {
  appended = [];
  URL.createObjectURL = vi.fn(() => "blob:atalho");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
    if (node instanceof HTMLAnchorElement) appended.push(node);
    return appendOriginal(node as Node);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function offerInstall(outcome: "accepted" | "dismissed" = "accepted") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome, platform: "web" }) });
  fireEvent(window, event);
  return { prompt, event };
}

describe("Netinho home-screen shortcut", () => {
  it("uses the browser installation prompt when available, without submitting the login form", async () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <InstallAppButton />
      </form>,
    );
    const { prompt, event } = offerInstall();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(event.defaultPrevented).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    expect(appended).toHaveLength(0);
  });

  it("shows installation instructions when no browser prompt is available", async () => {
    render(<InstallAppButton />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("Instalar aplicativo"), expect.any(Object)));
    expect(appended).toHaveLength(0);
  });

  it("does not reuse a consumed browser installation event", async () => {
    render(<InstallAppButton />);
    const { prompt } = offerInstall();
    const button = screen.getByRole("button");
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(appended).toHaveLength(0);
  });

  it("shows instructions if the browser refuses the prompt", async () => {
    render(<InstallAppButton />);
    const { prompt } = offerInstall();
    prompt.mockRejectedValueOnce(new Error("Unavailable"));
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(appended).toHaveLength(0);
  });

  it("says the shortcut already exists once the app is installed", async () => {
    render(<InstallAppButton />);
    fireEvent(window, new Event("appinstalled"));
    const button = await screen.findByRole("button");
    fireEvent.click(button);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining("já está na tela inicial"));
    expect(appended).toHaveLength(0);
  });
});
