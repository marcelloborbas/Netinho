import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ slug: "abdenego-eugenio", isAdmin: true }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: () => React.ReactNode }) => ({
    options,
    useParams: () => ({ slug: state.slug }),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/queries", () => ({
  meQuery: { queryKey: ["me"], queryFn: async () => ({ isAdmin: state.isAdmin }) },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  },
}));

import { Route } from "@/routes/editar-representante.$slug";

afterEach(cleanup);

describe("Representative editor rendering", () => {
  it.each([
    ["abdenego-eugenio", "Abdenego Eugênio"],
    ["livaldo-souza-silva", "Livaldo Souza Silva"],
  ])("renders the authorized editor for %s without undefined password state", async (slug, name) => {
    state.slug = slug;
    state.isAdmin = true;
    const Editor = Route.options.component;
    if (!Editor) throw new Error("Representative editor component is missing");
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Editor /></QueryClientProvider>);
    expect(await screen.findByRole("heading", { name: "Editar representante comercial" })).toBeVisible();
    expect(await screen.findByLabelText("Nome completo")).toHaveValue(name);
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeVisible();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it("keeps the editor restricted for non-administrators", async () => {
    state.slug = "abdenego-eugenio";
    state.isAdmin = false;
    const Editor = Route.options.component;
    if (!Editor) throw new Error("Representative editor component is missing");
    render(<QueryClientProvider client={new QueryClient()}><Editor /></QueryClientProvider>);
    expect(await screen.findByText("Acesso exclusivo do administrador.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Salvar alterações" })).not.toBeInTheDocument();
  });
});