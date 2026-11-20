import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  seller: false,
  search: {} as { modo?: string; marca?: string; q?: string },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => state.search }),
  Link: ({ children, to }: { children: React.ReactNode; to?: string }) => (
    <a href={to ?? "#"}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/catalogo" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQuery: (options: { queryKey: string[]; enabled?: boolean }) => {
    const key = options.queryKey[0];
    if (key === "access")
      return {
        data: {
          can_sell: state.seller,
          level: state.seller ? 2 : 3,
          name: "Marcello",
          email: "test@example.com",
        },
      };
    if (key === "products")
      return {
        data: [
          {
            id: "fco-test",
            code: "FCO-TESTE",
            application: "Peça de teste para veículo",
            refs: "",
            categories: { name: "Injeção eletrônica" },
            manufacturer: "FCO",
            stock: 8,
            price_cash: 1234.56,
            price_30: null,
            price_30_45_60: null,
            price_30_45_60_75: null,
          },
        ],
        isLoading: false,
        refetch: vi.fn(),
      };
    return { data: [] };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn(), prefetchQuery: vi.fn() }),
}));
import { toast } from "sonner";
import { Route } from "@/routes/_authenticated/catalogo";
import { Route as HomeRoute } from "@/routes/index";
const Catalog = Route.options.component!;
const Home = HomeRoute.options.component!;
afterEach(() => {
  cleanup();
  state.search = {};
  localStorage.clear();
  sessionStorage.removeItem("netinho-entry-approved");
  vi.clearAllMocks();
});
describe("catalog access presentation", () => {
  it("greets the authorized representative without the removed shortcut cards", () => {
    state.seller = true;
    sessionStorage.setItem("netinho-entry-approved", "1");
    render(<Home />);
    expect(screen.getByText("Marcello")).toBeVisible();
    // Os atalhos foram retirados a pedido do cliente e não devem voltar à página inicial.
    for (const name of [/Novo pedido/, /Consultar peças/, /Meus pedidos/, /Promoções/])
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    // O botão de WhatsApp foi removido da página inicial a pedido do cliente.
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Administração")).not.toBeInTheDocument();
  });
  it("keeps the home open to visitors, who only browse", () => {
    state.seller = false;
    sessionStorage.setItem("netinho-entry-approved", "1");
    render(<Home />);
    expect(screen.getByText("Marcello")).toBeVisible();
    expect(screen.getByRole("img", { name: "Logo fiat" })).toBeVisible();
    expect(screen.queryByText("Administração")).not.toBeInTheDocument();
  });
  it("shows only the cash price to visitors and offers a representative instead of an order", () => {
    state.seller = false;
    render(<Catalog />);
    fireEvent.click(screen.getByRole("button", { name: "Todas as peças" }));
    expect(screen.getByText("Condição à vista")).toBeVisible();
    expect(screen.getByText(/1\.234,56/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Comprar peça FCO-TESTE" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Ver ficha técnica da peça FCO-TESTE" }),
    ).toBeDisabled();
    expect(screen.queryByText(/Estoque/)).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("shows stock and adds the part to the sale for an authorized seller", async () => {
    state.seller = true;
    render(<Catalog />);
    fireEvent.click(screen.getByRole("button", { name: "Todas as peças" }));
    expect(screen.queryByText(/Estoque/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comprar peça FCO-TESTE" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Peça FCO-TESTE adicionada ao pedido."),
    );
  });
  it("does not list HD parts while the brand is still marked as coming soon", () => {
    state.seller = true;
    render(<Catalog />);
    fireEvent.click(screen.getByRole("button", { name: "Todas as peças" }));
    expect(screen.queryByRole("heading", { name: "K6246.HD" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Injeção eletrônica" })).toBeVisible();
  });
});
