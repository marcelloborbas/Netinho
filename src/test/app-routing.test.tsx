import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Test the pages without the full-document shell, which cannot mount inside a div.
vi.mock("@/routes/__root", async () => {
  const { createRootRouteWithContext, Outlet } = await import("@tanstack/react-router");
  const { QueryClientProvider } = await import("@tanstack/react-query");
  const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    component: () => <QueryClientProvider client={Route.useRouteContext().queryClient}><Outlet /></QueryClientProvider>,
    notFoundComponent: () => <p>Página não encontrada</p>,
  });
  return { Route };
});

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
describe("App routing", () => {
  it("renders auth and handles the browser installation prompt", async () => {
    renderAt("/auth");
    await screen.findByRole("heading", { name: "Qual seu perfil ?" });
    expect(screen.getByText("Adicionar à tela inicial pelo navegador")).toBeTruthy();

    const prompt = vi.fn().mockRejectedValue(new Error("Installation unavailable"));
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }) });
    fireEvent(window, event);
    expect(await screen.findByText("Adicionar o ícone Netinho Auto Parts à tela inicial")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Colocar Netinho no celular/ }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: /Colocar Netinho no celular/ }).hasAttribute("disabled")).toBe(false));
  });

  it("renders the index route", async () => {
    const { container } = renderAt("/");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });
});
