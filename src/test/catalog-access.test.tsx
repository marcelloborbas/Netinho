import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  seller: false,
  customerEnabled: false,
  search: {} as { modo?: string; marca?: string },
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
    if (key === "customers") {
      state.customerEnabled = options.enabled === true;
      return { data: [] };
    }
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
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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
  vi.clearAllMocks();
});
describe("catalog access presentation", () => {
  it("shows the sales entry to an authorized representative", () => {
    state.seller = true;
    render(<Home />);
    expect(screen.getByRole("heading", { name: /Marcello/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "Vender" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver Catálogo" })).toBeVisible();
    expect(screen.queryByText("Vender · restrito")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administração" })).not.toBeInTheDocument();
  });
  it("keeps selling away from visitors but keeps the catalog open", () => {
    state.seller = false;
    render(<Home />);
    expect(screen.getByText("Vender · restrito")).toBeVisible();
    expect(screen.getByText(/A consulta ao catálogo é livre/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver Catálogo" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Vender" })).not.toBeInTheDocument();
  });
  it("shows only the cash price to visitors and offers a representative instead of an order", () => {
    state.seller = false;
    render(<Catalog />);
    expect(screen.getByText("Preço à vista")).toBeVisible();
    expect(screen.getByText(/1\.234,56/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Comprar peça FCO-TESTE" })).not.toBeInTheDocument();
    expect(state.customerEnabled).toBe(false);
    expect(
      screen.queryByRole("complementary", { name: "Resumo do pedido" }),
    ).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("shows commercial prices and adds the part to the sale for an authorized seller", async () => {
    state.seller = true;
    render(<Catalog />);
    expect(screen.getByText("Valores")).toBeVisible();
    expect(screen.getByText(/1\.234,56/)).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "Comprar peça FCO-TESTE" })[0]!);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Peça FCO-TESTE adicionada à venda."),
    );
  });
  it("does not sell HD parts while the brand is still marked as coming soon", () => {
    state.seller = true;
    render(<Catalog />);
    const hdButton = screen.getByRole("button", { name: "Comprar peça K6246.HD" });
    fireEvent.click(hdButton);
    expect(toast.info).toHaveBeenCalledWith("HD Embreagens: em breve.");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
