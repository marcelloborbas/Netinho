import { describe, it, expect, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({
  user: { id: "google-user" } as { id: string } | null,
  access: { level: 3, can_sell: false, email: "viewer@example.com", name: "Visitante" },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  redirect: (options: unknown) => ({ redirect: options }),
  Link: () => null,
  Outlet: () => null,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: state.user } }) } },
}));
import { Route } from "@/routes/_authenticated/route";
const options = Route.options as unknown as { beforeLoad: (args: unknown) => Promise<unknown> };
function enter(pathname: string) {
  return options.beforeLoad({
    location: { pathname },
    context: { queryClient: { fetchQuery: async () => state.access } },
  });
}
beforeEach(() => {
  localStorage.clear();
  state.user = { id: "google-user" };
  state.access = { level: 3, can_sell: false, email: "viewer@example.com", name: "Visitante" };
  localStorage.setItem(
    "netinho-vendedor",
    JSON.stringify({ email: state.access.email, accessType: "Visitante" }),
  );
});
describe("commercial route boundaries", () => {
  it("keeps the catalog consultation open without a session but blocks every other area", async () => {
    state.user = null;
    await expect(enter("/catalogo")).resolves.toBeTruthy();
    for (const path of ["/clientes", "/pedido", "/pedidos", "/admin"])
      await expect(enter(path)).rejects.toEqual({ redirect: { to: "/auth" } });
  });
  it("allows a Google visitor to browse but blocks orders, customer data and admin", async () => {
    await expect(enter("/catalogo")).resolves.toBeTruthy();
    for (const path of ["/clientes", "/pedido", "/pedidos", "/pedidos/123", "/admin"])
      await expect(enter(path)).rejects.toEqual({ redirect: { to: "/catalogo" } });
  });
  it("cannot promote a visitor by changing the profile in localStorage", async () => {
    localStorage.setItem(
      "netinho-vendedor",
      JSON.stringify({ email: state.access.email, accessType: "Representante Comercial" }),
    );
    await expect(enter("/pedido")).rejects.toEqual({ redirect: { to: "/catalogo" } });
  });
  it("allows an authorized representative to create orders but blocks administration", async () => {
    state.access.level = 2;
    state.access.can_sell = true;
    await expect(enter("/pedido")).resolves.toBeTruthy();
    await expect(enter("/admin")).rejects.toEqual({ redirect: { to: "/catalogo" } });
  });
  it("does not reuse a profile belonging to another account", async () => {
    state.access.email = "other@example.com";
    await expect(enter("/catalogo")).resolves.toBeTruthy();
    await expect(enter("/pedido")).rejects.toEqual({ redirect: { to: "/auth" } });
  });
});
