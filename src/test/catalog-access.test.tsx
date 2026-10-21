import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  seller: false,
  customerEnabled: false,
  search: {} as { modo?: string; marca?: string },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => state.search }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
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
  it("offers selling and supplier catalogs after login", () => {
    state.seller = true;
    render(<Home />);
    expect(screen.getByRole("heading", { name: /Marcello/ })).toBeVisible();
    expect(screen.getAllByRole("img", { name: "FCO Automotive" })[0]).toBeVisible();
    expect(screen.getAllByRole("img", { name: "HD Embreagens" })[0]).toBeVisible();
    expect(screen.getByRole("heading", { name: "Editar e revisar" })).toBeVisible();
    expect(screen.getAllByText("netinhoautoparts@gmail.com")[0]).toBeVisible();
    expect(screen.getByText("Consultar promoção")).toBeVisible();
  });
  it("routes a visitor to the free catalog consultation instead of sales tools", () => {
    state.seller = false;
    render(<Home />);
    expect(screen.getByText("Visitante")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Vender" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Administração e cadastros" }),
    ).not.toBeInTheDocument();
  });
  it("keeps commercial values away from visitors and offers a representative instead of an order", async () => {
    state.seller = false;
    render(<Catalog />);
    expect(screen.queryByText(/1\.234,56/)).not.toBeInTheDocument();
    expect(screen.getByText(/Valores disponíveis somente para representantes/)).toBeVisible();
    expect(state.customerEnabled).toBe(false);
    expect(
      screen.queryByRole("complementary", { name: "Resumo do pedido" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comprar peça FCO-TESTE" }));
    expect(await screen.findByRole("group", { name: "Contato para comprar FCO-TESTE" })).toBeVisible();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("shows commercial prices and adds the part to the sale for an authorized seller", async () => {
    state.seller = true;
    render(<Catalog />);
    expect(screen.getByText(/1\.234,56/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Comprar peça FCO-TESTE" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Peça FCO-TESTE adicionada à venda."),
    );
  });
  it("does not list HD parts while the brand is still marked as coming soon", () => {
    state.seller = true;
    render(<Catalog />);
    expect(screen.getByRole("button", { name: "HD Embreagens — em breve" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "K6246.HD" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Injeção eletrônica" })).toBeVisible();
  });
});
