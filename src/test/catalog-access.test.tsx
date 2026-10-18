import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
const state = vi.hoisted(() => ({
  seller: false,
  customerEnabled: false,
  search: {} as { modo?: string; marca?: string },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => state.search }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
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
import { Route } from "@/routes/_authenticated/catalogo";
import { Route as HomeRoute } from "@/routes/index";
const Catalog = Route.options.component!;
const Home = HomeRoute.options.component!;
afterEach(() => {
  cleanup();
  state.search = {};
});
describe("catalog access presentation", () => {
  it("offers selling and supplier catalogs after login", () => {
    state.seller = true;
    render(<Home />);
    expect(screen.getByRole("heading", { name: /Sr. Marcello/ })).toBeVisible();
    expect(screen.getAllByRole("img", { name: "FCO Automotive" })[0]).toBeVisible();
    expect(screen.getAllByRole("img", { name: "HD Embreagens" })[0]).toBeVisible();
    expect(screen.getByRole("heading", { name: "Editar e revisar" })).toBeVisible();
    expect(screen.getByText("netinhoautoparts@gmail.com")).toBeVisible();
    expect(screen.getByRole("link", { name: /Consultar promoção/ })).toBeVisible();
  });
  it("does not give a visitor sales tools on the home screen", () => {
    state.seller = false;
    render(<Home />);
    expect(screen.queryByRole("heading", { name: "Montar venda" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Clientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Meus pedidos" })).not.toBeInTheDocument();
    expect(screen.getByText("Visitante")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ver catálogos" })).toBeVisible();
  });
  it("keeps supplier consultation free of sales controls even for an authorized seller", () => {
    state.seller = true;
    state.search = { modo: "consulta", marca: "HD" };
    render(<Catalog />);
    expect(screen.queryByText(/1\.234,56/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Resumo do pedido" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "FCO-TESTE" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "K6246.HD" })).toBeVisible();
    expect(state.customerEnabled).toBe(false);
  });
  it("never renders prices or order controls for visitors, even if a response accidentally contains prices", () => {
    state.seller = false;
    const { container } = render(<Catalog />);
    expect(screen.queryByText(/1\.234,56/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar ao pedido" })).not.toBeInTheDocument();
    expect(state.customerEnabled).toBe(false);
    expect(
      screen.queryByRole("complementary", { name: "Resumo do pedido" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Catálogo sem exibição de valores/)).toBeVisible();
    if (process.env["NETINHO_QA_EXPORT"]) {
      mkdirSync("tmp/qa", { recursive: true });
      writeFileSync(
        "tmp/qa/catalogo-visitante.html",
        `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/styles.css"></head><body><div style="padding:12px;background:#17334d;text-align:center;font:12px sans-serif">Prévia visual de teste · dados fictícios · perfil visitante</div><main style="max-width:1280px;margin:auto;padding:24px">${container.innerHTML}</main></body></html>`,
      );
    }
  });
  it("shows commercial prices only to authorized sellers and filters manufacturer results", () => {
    state.seller = true;
    render(<Catalog />);
    expect(screen.getByText(/1\.234,56/)).toBeVisible();
    expect(state.customerEnabled).toBe(true);
    expect(
      screen.queryByRole("heading", { name: "Perto de você. Do seu negócio." }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resumo do pedido" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "FCO Automotive" }));
    expect(screen.getByRole("heading", { name: "FCO-TESTE" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "K6246.HD" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "HD Embreagens" }));
    expect(screen.queryByRole("heading", { name: "FCO-TESTE" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "K6246.HD" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Buscar peças"), { target: { value: "K60858.HD" } });
    expect(screen.getByRole("heading", { name: "K60858.HD" })).toBeVisible();
  });
});
