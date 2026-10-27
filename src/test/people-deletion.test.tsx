import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  invoke: vi.fn(), success: vi.fn(), error: vi.fn(),
  adminId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  targetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: { component: () => React.ReactNode }) => ({ options }), Link: () => null }));
vi.mock("@/lib/queries", () => ({ meQuery: { queryKey: ["me"], queryFn: async () => ({ id: mock.adminId, isAdmin: true }) } }));
vi.mock("sonner", () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: mock.invoke },
  from: (table: string) => ({ select: () => ({ order: async () => ({ data: table === "profiles" ? [
    { id: mock.adminId, full_name: "Admin", email: "admin@example.test", site_role: "Administrador", access_active: true },
    { id: mock.targetId, full_name: "Teste", email: "teste@example.test", site_role: "Visitante", access_active: true },
  ] : [], error: null }) }) }),
} }));
import { Route } from "@/routes/_authenticated/pessoas";
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const Page = Route.options.component;
  render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
  return client;
}
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, "confirm").mockReturnValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("PESSOAL deletion confirmation", () => {
  it("prevents deleting the logged-in administrator", async () => {
    mount(); const button = await screen.findByRole("button", { name: "Excluir definitivamente Admin" });
    expect(button).toBeDisabled(); fireEvent.click(button);
    expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("does not invoke deletion when confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir definitivamente Teste" }));
    expect(window.confirm).toHaveBeenCalledOnce(); expect(mock.invoke).not.toHaveBeenCalled();
  });
  it("keeps the list intact and never announces success on failure", async () => {
    mock.invoke.mockResolvedValue({ data: null, error: { message: "Falha" } }); const client = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir definitivamente Teste" }));
    await waitFor(() => expect(mock.error).toHaveBeenCalled());
    expect(mock.success).not.toHaveBeenCalled();
    expect(client.getQueryData<Array<{ id: string }>>(["admin-people"])?.some(p => p.id === mock.targetId)).toBe(true);
  });
  it("immediately removes only the confirmed target from the list", async () => {
    mock.invoke.mockResolvedValue({ data: { success: true, deletedUserId: mock.targetId }, error: null }); const client = mount();
    // Keep the old mocked server fixture from replacing the updated cache.
    vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir definitivamente Teste" }));
    await waitFor(() => expect(mock.success).toHaveBeenCalledOnce());
    expect(client.getQueryData<Array<{ id: string }>>(["admin-people"])?.map(p => p.id)).toEqual([mock.adminId]);
    expect(screen.queryByRole("button", { name: "Excluir definitivamente Teste" })).not.toBeInTheDocument();
    expect(client.invalidateQueries).toHaveBeenCalled();
  });
});