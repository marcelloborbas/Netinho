import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  update: vi.fn(),
  eqCalls: [] as Array<[string, unknown]>,
  success: vi.fn(),
  error: vi.fn(),
  customers: [] as Array<Record<string, unknown>>,
  reps: [] as Array<Record<string, unknown>>,
}));

vi.mock("sonner", () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const rows = table === "customers" ? mock.customers : mock.reps;
      const chain: Record<string, unknown> = {
        select: () => chain, is: () => chain, not: () => chain, order: () => chain,
        update: (values: unknown) => { mock.update(values); return chain; },
        eq: (col: string, value: unknown) => { mock.eqCalls.push([col, value]); return chain; },
        maybeSingle: async () => ({ data: { id: "c1" }, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: rows, error: null }),
      };
      return chain;
    },
  },
}));

import { CustomerPortfolio, canReceiveCustomers } from "@/components/people/CustomerPortfolio";

const ANA = "11111111-1111-4111-8111-111111111111";
const BETO = "22222222-2222-4222-8222-222222222222";
const CAIO = "33333333-3333-4333-8333-333333333333";
const customer = (id: string, name: string, seller: string) => ({ id, company_name: name, trade_name: null, cnpj: null, city: null, state: null, seller_id: seller });

function mount(ownerId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CustomerPortfolio ownerId={ownerId} ownerName="Ana" enabled /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.eqCalls = [];
  mock.customers = [customer("c1", "Auto Peças Um", ANA), customer("c2", "Mecânica Dois", BETO)];
  mock.reps = [
    { user_id: ANA, full_name: "Ana", email: "ana@x.test", active: true },
    { user_id: BETO, full_name: "Beto", email: "beto@x.test", active: true },
    { user_id: CAIO, full_name: "Caio", email: "caio@x.test", active: false },
  ];
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Carteira de clientes na ficha", () => {
  it("lista somente os clientes da própria carteira", async () => {
    mount(ANA);
    const list = await screen.findByRole("list", { name: "Carteira de Ana" });
    expect(within(list).getByText("Auto Peças Um")).toBeInTheDocument();
    expect(within(list).queryByText("Mecânica Dois")).not.toBeInTheDocument();
  });

  it("só aceita como destino representantes ativos e vinculados", () => {
    expect(canReceiveCustomers(mock.reps as never, BETO)).toBe(true);
    expect(canReceiveCustomers(mock.reps as never, CAIO)).toBe(false);
    expect(canReceiveCustomers(mock.reps as never, "sem-conta")).toBe(false);
  });

  it("bloqueia atribuição para quem não é representante ativo", async () => {
    mount(CAIO);
    expect(await screen.findByText(/precisa ter cadastro comercial ativo/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Atribuir/ })).not.toBeInTheDocument();
  });

  it("transfere gravando o novo responsável e conferindo o responsável atual", async () => {
    mount(ANA);
    fireEvent.change(await screen.findByLabelText("Novo responsável por Auto Peças Um"), { target: { value: BETO } });
    fireEvent.click(screen.getByRole("button", { name: /Transferir$/ }));
    await waitFor(() => expect(mock.success).toHaveBeenCalledOnce());
    expect(mock.update).toHaveBeenCalledWith({ seller_id: BETO });
    expect(mock.eqCalls).toEqual(expect.arrayContaining([["id", "c1"], ["seller_id", ANA]]));
  });

  it("não oferece representante inativo como destino", async () => {
    mount(ANA);
    const select = await screen.findByLabelText("Novo responsável por Auto Peças Um");
    expect(within(select).queryByRole("option", { name: "Caio" })).not.toBeInTheDocument();
  });
});
