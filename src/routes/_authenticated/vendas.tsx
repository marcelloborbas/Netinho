import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Minus, ShoppingCart, FilePenLine, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { customersQuery, productsQuery, productMatches, type Product } from "@/lib/queries";
import { draftActions, draftTotals, useDraft } from "@/lib/order-store";
import { brl } from "@/lib/brand";
import { readOffers, type Offer } from "@/routes/ofertas";

export const Route = createFileRoute("/_authenticated/vendas")({
  validateSearch: (s: Record<string, unknown>) => ({ modo: s["modo"] === "consulta" ? "consulta" as const : "venda" as const, q: typeof s["q"] === "string" ? s["q"] : "", promo: typeof s["promo"] === "string" ? s["promo"] : "" }),
  head: () => ({ meta: [{ title: "Vendas e Orçamentos | Netinho Auto Parts" }] }),
  component: SalesPage,
});

function SalesPage() {
  const search = Route.useSearch();
  const draft = useDraft();
  const { data: customers = [], isLoading: loadingCustomers, isError: customersError, refetch: retryCustomers } = useQuery(customersQuery);
  const { data: products = [], isLoading: loadingProducts } = useQuery(productsQuery);
  const [q, setQ] = useState(search.q || search.promo);
  const [offers, setOffers] = useState<Offer[]>([]);
  const addedCampaign = useRef<string | null>(null);
  // A campanha abre a tela de vendas pela identificação do cliente.
  // A peça escolhida fica localizada na busca, sem entrar no pedido antes da seleção.
  useEffect(() => {
    if (search.promo) {
      setQ(search.promo);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [search.promo]);
  useEffect(() => { readOffers().then(setOffers).catch(() => toast.error("Não foi possível carregar os preços da campanha.")); }, []);
  useEffect(() => {
    if (!search.promo || !draft.customerId || loadingProducts || !offers.length) return;
    const key = `${search.promo}:${draft.customerId}`;
    if (addedCampaign.current === key) return;
    const offer = offers.find(([code]) => code.toUpperCase() === search.promo.toUpperCase());
    if (!offer) return;
    const product = products.find((p) => p.code.toUpperCase() === search.promo.toUpperCase() && (p.manufacturer ?? "FCO") === "FCO");
    if (!product) {
      addedCampaign.current = key;
      toast.error(`A peça ${search.promo} ainda não está cadastrada para pedidos. Consulte a distribuidora.`);
      return;
    }
    const prices = { cash: product.price_cash, "30": product.price_30, "30_45_60": product.price_30_45_60, "30_45_60_75": product.price_30_45_60_75 };
    if (Object.values(prices).every((v) => v == null)) {
      addedCampaign.current = key;
      toast.error("Esta peça está sem preço autorizado para pedidos.");
      return;
    }
    addedCampaign.current = key;
    if (draftActions.get().items.some((item) => item.productId === product.id)) {
      toast.info("A peça escolhida já está no pedido.");
      return;
    }
    draftActions.update({ kind: "pedido", paymentTerm: prices["30_45_60"] != null ? "30_45_60" : prices.cash != null ? "cash" : prices["30"] != null ? "30" : "30_45_60_75" });
    draftActions.addItem({ productId: product.id, code: product.code, category: product.categories?.name ?? "Peça FCO", application: product.application ?? "", prices, quantity: 1 });
    toast.success(`Peça ${product.code} incluída automaticamente no pedido.`);
  }, [search.promo, draft.customerId, products, loadingProducts, offers]);
  const [brand, setBrand] = useState<"all" | "FCO" | "HD">("all");
  const [page, setPage] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const term = useDeferredValue(q);
  const campaignProducts = useMemo(() => offers.filter(([code]) => !products.some((p) => p.code.toUpperCase() === code.toUpperCase() && (p.manufacturer ?? "FCO") === "FCO")).map(([code, application, price, stock]) => ({ id: `fco-campaign-${code}`, code, application, manufacturer: "FCO", categories: { name: "Caixas de direção" }, price_cash: null, price_30: null, price_30_45_60: price, price_30_45_60_75: null, stock })) as unknown as Product[], [offers, products]);
  const matches = useMemo(() => [...products, ...campaignProducts].filter((p) =>
    p.manufacturer !== "HD" && (brand === "all" || (p.manufacturer ?? "FCO") === brand) && productMatches(p, term)
  ), [products, campaignProducts, brand, term]);
  const kind = draft.items.length || draft.customerId ? draft.kind : (search.modo === "consulta" ? "orcamento" : "pedido");
  const selected = customers.find((c) => c.id === draft.customerId);
  const total = draftTotals(draft);
  function setKind(next: "pedido" | "orcamento") {
    draftActions.update({ kind: next });
  }
  function add(p: (typeof matches)[number]) {
    if (!draft.customerId) { toast.error("Identifique o cliente antes de adicionar peças."); return; }
    const prices = {
      cash: p.price_cash,
      "30": p.price_30,
      "30_45_60": p.price_30_45_60,
      "30_45_60_75": p.price_30_45_60_75,
    };
    if (Object.values(prices).every((v) => v == null)) {
      toast.error("Peça sem preço cadastrado. Consulte a distribuidora."); return;
    }
    if (p.id.startsWith("fco-campaign-")) draftActions.update({ paymentTerm: "30_45_60" });
    draftActions.addItem({
      productId: p.id, code: p.code, category: p.categories?.name ?? "Peça automotiva",
      application: p.application ?? "", prices, quantity: quantities[p.id] ?? 1,
    });
    toast.success("Peça adicionada ao " + (kind === "pedido" ? "pedido." : "orçamento."));
  }
  return <div className="mx-auto w-full max-w-6xl space-y-4 pb-8">
    <header className="rounded-2xl border border-[#b8cee8] bg-[#edf4ff] px-4 py-5 text-center text-[#102a52] shadow-sm">
      <h1 className="text-[28px] font-extrabold sm:text-[34px]">Vendas e Orçamentos</h1>
      <p className="mt-2 text-sm">Identifique o cliente, escolha as peças e revise antes de finalizar.</p>
    </header>
    <section className="space-y-4 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm">
      <h2 className="font-extrabold text-[#102a52]">1. Cliente</h2>
      {search.promo && <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-900">Peça escolhida: {search.promo}. Selecione o cliente para incluí-la automaticamente no pedido.</p>}
      {customersError && (
        <div role="alert" className="space-y-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">
          <p>Não foi possível carregar os clientes. Verifique sua autorização ou a conexão com o servidor. Nenhum cadastro foi excluído.</p>
          <button type="button" onClick={() => void retryCustomers()} className="rounded-lg bg-red-700 px-3 py-2 font-bold text-white">Tentar novamente</button>
        </div>
      )}
      {!loadingCustomers && !customersError && customers.length === 0 && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          Nenhum cliente disponível para esta conta. Os clientes de outro representante podem não aparecer aqui. Confira a conta usada no login ou consulte a Administração.
        </p>
      )}
      <select aria-label="Selecionar cliente" value={draft.customerId ?? ""} onChange={(e) => {
        const c = customers.find((x) => x.id === e.target.value);
        if (c) draftActions.update({ customerId: c.id, customerName: c.trade_name || c.company_name, buyer: c.buyer ?? "", carrier: c.carrier ?? "", kind });
      }} className="min-h-12 w-full rounded-xl border border-[#a7c1e5] bg-[#f7faff] px-3 text-[#102a52]">
        <option value="">{loadingCustomers ? "Carregando clientes..." : "Selecione o cliente para finalizar o pedido"}</option>
        {customers.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
      </select>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-[#174e9b]">{selected ? `Cliente: ${selected.trade_name || selected.company_name}` : "Nenhum cliente selecionado"}</p>
        <Link to="/clientes" className="shrink-0 rounded-lg border border-[#a7c1e5] bg-[#eaf2ff] px-3 py-2 text-sm font-bold text-[#102a52]">+ Novo cliente</Link>
      </div>
      <h2 className="font-extrabold text-[#102a52]">2. Tipo de atendimento</h2>
      <div className="grid grid-cols-2 gap-3">
        {([{ value: "pedido", label: "Venda", icon: ShoppingCart }, { value: "orcamento", label: "Orçamento", icon: FilePenLine }] as const).map(({value,label,icon:Icon}) =>
          <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-2 font-extrabold ${kind === value ? "border-[#174e9b] bg-white text-[#102a52] ring-2 ring-[#174e9b] ring-inset" : "border-[#a7c1e5] bg-[#eaf2ff] text-[#102a52]"}`}>
            <Icon size={20}/>{label}
          </button>)}
      </div>
    </section>
    <section className="space-y-4 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm">
      <h2 className="font-extrabold text-[#102a52]">3. Adicionar outras peças</h2>
      {draft.items.length > 0 && <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-900">Peças já selecionadas: {draft.items.map((item) => `${item.code} (qtd. ${item.quantity})`).join(", ")}. Você pode acrescentar outras peças abaixo.</p>}
      <div className="grid grid-cols-3 gap-2">
        {(["all", "FCO", "HD"] as const).map((value) => <button key={value} type="button" disabled={value === "HD"} aria-label={value === "HD" ? "HD Embreagens — em breve" : value} aria-pressed={brand === value}
          onClick={() => { if (value === "HD") return; setBrand(value); setPage(1); }}
          className={`min-h-12 rounded-xl border-2 px-2 font-extrabold ${value === "HD" ? "cursor-not-allowed bg-zinc-200 grayscale opacity-65" : ""} ${brand === value ? "border-[#174e9b] bg-white text-[#102a52] ring-2 ring-[#174e9b] ring-inset" : "border-[#a7c1e5] bg-[#eaf2ff] text-[#102a52]"}`}>
          {value === "all" ? "Geral" : <img className="mx-auto h-9 max-w-full object-contain" alt={value} src={value === "FCO" ? "/images/brands/fco.webp" : "/images/brands/hd.png"}/>}{value === "HD" && <span className="block text-xs font-extrabold text-zinc-700">Em breve</span>}
        </button>)}
      </div>
      <div className="relative">
        <Search size={19} className="absolute left-3 top-3.5 text-[#174e9b]"/>
        <input aria-label="Pesquisar peças" placeholder="Código, peça ou aplicação" value={q} onChange={(e) => {setQ(e.target.value);setPage(1);}}
          className="min-h-12 w-full rounded-xl border border-[#a7c1e5] bg-[#f7faff] pl-10 pr-3 text-sm text-[#102a52]"/>
      </div>
      <p className="text-sm font-semibold text-[#102a52]">{loadingProducts ? "Carregando peças..." : `${matches.length} peças encontradas`}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {matches.slice((page-1)*12,page*12).map((p) => <li key={p.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#b8cee8] bg-[#f7faff] p-3">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-[#102a52]">{p.code} · {p.manufacturer ?? "FCO"}</p>
            <p className="mt-1 text-base font-extrabold text-[#102a52]">{p.categories?.name || "Peça automotiva"}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{p.application}</p>
            <div className="mt-1 space-y-0.5 text-sm font-bold text-[#174e9b]">
              {p.price_cash != null && <p>À vista: {brl(p.price_cash)}</p>}
              {p.price_30 != null && <p>30 dias: {brl(p.price_30)}</p>}
              {p.price_30_45_60 != null && <p>30/45/60 dias: {brl(p.price_30_45_60)}</p>}
              {p.price_30_45_60_75 != null && <p>30/45/60/75 dias: {brl(p.price_30_45_60_75)}</p>}
              {p.price_cash == null && p.price_30 == null && p.price_30_45_60 == null && p.price_30_45_60_75 == null && <p>Consulte valores</p>}
            </div>
          </div>
          <div className="flex w-full items-center justify-center gap-2 border-t border-[#b8cee8] pt-2">
            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#a7c1e5] bg-white p-1" aria-label={`Quantidade de ${p.code}`}>
              <button type="button" disabled={(quantities[p.id] ?? 1) <= 1}
                onClick={() => setQuantities((old) => ({ ...old, [p.id]: Math.max(1, (old[p.id] ?? 1) - 1) }))}
                aria-label={`Diminuir quantidade de ${p.code}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#102a52] disabled:opacity-40"><Minus size={17}/></button>
              <span aria-live="polite" className="min-w-7 text-center font-extrabold text-[#102a52]">{quantities[p.id] ?? 1}</span>
              <button type="button" onClick={() => setQuantities((old) => ({ ...old, [p.id]: (old[p.id] ?? 1) + 1 }))}
                aria-label={`Aumentar quantidade de ${p.code}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#102a52]"><Plus size={17}/></button>
            </div>
            <button type="button" disabled={!draft.customerId} onClick={() => add(p)} aria-label={`Adicionar ${p.code} ao pedido`}
              className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-[#174e9b] bg-[#eaf2ff] px-3 text-sm font-bold text-[#102a52] disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16}/> Adicionar</button>
          </div>
        </li>)}
      </ul>
      {matches.length > 12 && <div className="flex items-center justify-center gap-3">
        <button type="button" disabled={page===1} onClick={() => setPage(page-1)} className="rounded-lg border border-[#a7c1e5] px-3 py-2 disabled:opacity-40">Anterior</button>
        <span className="text-sm">{page} de {Math.ceil(matches.length/12)}</span>
        <button type="button" disabled={page*12>=matches.length} onClick={() => setPage(page+1)} className="rounded-lg border border-[#a7c1e5] px-3 py-2 disabled:opacity-40">Próxima</button>
      </div>}
    </section>
    <section className="space-y-3 rounded-2xl border border-[#b8cee8] bg-[#edf4ff] p-4 text-[#102a52] shadow-sm">
      <h2 className="font-extrabold">4. Revisar {kind === "pedido" ? "venda" : "orçamento"}</h2>
      <p className="text-sm">{total.units} unidades em {draft.items.length} itens</p>
      <p className="text-xl font-extrabold">{brl(total.net)}</p>
      <Link to="/pedido" className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#174e9b] px-4 font-extrabold text-white ${!draft.items.length || !draft.customerId ? "pointer-events-none opacity-50" : ""}`} aria-disabled={!draft.items.length || !draft.customerId}>
        <ClipboardCheck size={20}/> Revisar e finalizar
      </Link>
      <p className="text-xs">O pedido só será registrado após sua confirmação na próxima etapa.</p>
    </section>
  </div>;
}
