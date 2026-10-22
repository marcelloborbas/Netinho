import { CatalogDownload } from "@/components/CatalogDownload";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, PackageSearch, X, ShoppingCart, MessageCircle, Grid2X2, Disc3, Cog, Zap, Filter, Gauge, CarFront, BatteryCharging, CircleDot, Settings2 } from "lucide-react";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, productMatches, type Product } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { draftActions } from "@/lib/order-store";
import { toast } from "sonner";
import { partImage } from "@/lib/part-images";
import hdCatalog from "@/data/hd-catalog.json";
import { readOffers } from "@/routes/ofertas";

export const Route = createFileRoute("/_authenticated/catalogo")({
  validateSearch: (search: Record<string, unknown>): { marca?: "FCO" | "HD" | undefined; modo?: "consulta" | "venda" | undefined; q?: string | undefined } => ({
    marca: search["marca"] === "FCO" || search["marca"] === "HD" ? search["marca"] : undefined,
    modo: search["modo"] === "consulta" || search["modo"] === "venda" ? search["modo"] : undefined,
    q: typeof search["q"] === "string" ? search["q"].slice(0, 100) : undefined,
  }),
  head: () => ({ meta: [
    { title: "Catálogo de Peças FCO e HD | Netinho Auto Parts" },
    { name: "description", content: "Catálogo de peças FCO e HD com códigos, aplicações, referências e preços disponíveis." },
  ] }),
  component: Catalog,
});

type CatalogProduct = Product & { localOnly?: boolean };
const localHd = hdCatalog.map((p) => ({
  id: p.id, code: p.code, application: p.application,
  refs: [p.name, p.refs].filter(Boolean).join(" · "),
  categories: { name: `HD · ${p.category}` }, category_id: "hd",
  manufacturer: "HD", image_url: p.image, catalog_page: p.catalogPage,
  price_cash: null, price_30: null, price_30_45_60: null,
  price_30_45_60_75: null, price_note: null, search_text: null,
  stock: 0, active: true, brand: "HD", created_at: "", updated_at: "", localOnly: true,
})) as CatalogProduct[];

function Catalog() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [manufacturer, setManufacturer] = useState(search.marca === "HD" ? "all" : (search.marca ?? "all"));
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const dq = useDeferredValue(q);
  const { data: products = [], isLoading, error, refetch } = useQuery(productsQuery);
  const { data: campaignOffers = [], isLoading: campaignLoading } = useQuery({ queryKey: ["fco-campaign-10-2026"], queryFn: readOffers, staleTime: Infinity });

  useEffect(() => {
    setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all"));
    setQ(search.q ?? "");
    setPage(1);
  }, [search.marca, search.q]);

  const localFco = useMemo(() => campaignOffers.filter(([code]) => !products.some((p) => p.code.toUpperCase() === code.toUpperCase() && (p.manufacturer ?? "FCO") === "FCO")).map(([code, application, price, stock]) => ({
    id: `fco-campaign-${code}`, code, application, refs: "",
    categories: { name: "Caixas de direção" }, category_id: "fco-campaign",
    manufacturer: "FCO" as const, image_url: null, catalog_page: null,
    price_cash: null, price_30: null, price_30_45_60: price,
    price_30_45_60_75: null, price_note: "Campanha outubro/2026", search_text: null,
    stock, active: true, brand: "FCO", created_at: "", updated_at: "", localOnly: true,
  })) as CatalogProduct[], [campaignOffers, products]);
  const combined = useMemo(() => [
    ...products,
    ...localFco,
    ...localHd.filter((hd) => !products.some((p) => p.manufacturer === "HD" && p.code === hd.code)),
  ], [products, localFco]);
  const categories = useMemo(() => Array.from(new Set(combined.filter((p) => p.manufacturer !== "HD").map((p) => p.categories?.name).filter((n): n is string => !!n))).sort(), [combined]);
  const list = useMemo(() => combined.filter((p) =>
    p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && (category === "all" || p.categories?.name === category) && productMatches(p, dq),
  ), [combined, manufacturer, category, dq]);
  const pageCount = Math.max(1, Math.ceil(list.length / 24));
  const currentPage = Math.min(page, pageCount);
  const reset = () => { setQ(""); setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all")); setCategory("all"); setPage(1); };
  const categoryIcon = (name: string) => /freio|disco|pastilha/i.test(name) ? Disc3 : /motor|coxim|embreagem/i.test(name) ? Cog : /suspens|amortec/i.test(name) ? Gauge : /elétr|eletr|igni|bobina/i.test(name) ? Zap : /filtro/i.test(name) ? Filter : /direç|direc/i.test(name) ? CarFront : /bateria/i.test(name) ? BatteryCharging : /rolamento/i.test(name) ? CircleDot : Settings2;

  return (
    <div className="catalog-showcase mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-6">
      <header className="catalog-showcase-heading rounded-2xl border border-[#b8cee8] bg-[#edf4ff] px-4 py-5 text-center text-[#102a52] shadow-sm">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">Catálogo de Peças</h1>

      </header>

      <section className="space-y-4 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm" aria-label="Pesquisar catálogo">
        <div className="relative">
          <Search className="absolute left-4 top-4 text-[#174e9b]" size={20} aria-hidden="true" />
          <input id="catalog-search" aria-label="Buscar peças" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Busque por código, peça, veículo ou aplicação"
            className="h-13 min-h-12 w-full rounded-xl border border-[#a7c1e5] bg-[#f7faff] pl-12 pr-12 text-sm text-[#102a52]" />
          {q && <button type="button" aria-label="Limpar busca" onClick={() => { setQ(""); setPage(1); }} className="absolute right-4 top-3.5 text-[#174e9b]"><X size={20}/></button>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm font-semibold text-[#102a52]">{list.length} peças encontradas</p>
          {(q || manufacturer !== "all" || category !== "all") && <button type="button" onClick={reset} className="text-sm font-bold text-[#174e9b] underline">Limpar filtros</button>}
        </div>
      </section>

      <nav className="catalog-category-filters" aria-label="Categorias de peças">
        <button type="button" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}><Grid2X2 size={20}/> Todas</button>
        {categories.map((name) => { const Icon = categoryIcon(name); const photo = partImage(name); return <button key={name} type="button" aria-pressed={category === name} onClick={() => { setCategory(name); setPage(1); }}>{photo ? <img src={photo} alt="" loading="lazy" className="h-12 w-14 rounded-lg object-contain" /> : <Icon size={35} strokeWidth={1.8} aria-hidden="true" />}<span>{name}</span></button>; })}
      </nav>
      {error && <div role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm">Não foi possível carregar todas as peças. <button type="button" className="font-bold underline" onClick={() => refetch()}>Tentar novamente</button></div>}
      {(isLoading || campaignLoading) && <p role="status" className="text-sm">Carregando catálogo...</p>}
      {list.length ? (
        <ul className="catalog-product-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice((currentPage - 1) * 24, currentPage * 24).map((p) => <CatalogCard key={p.id} p={p}/>)}
        </ul>
      ) : !isLoading && <div className="surface-card p-10 text-center"><PackageSearch className="mx-auto text-primary" size={36}/><p className="mt-3 font-bold">Nenhuma peça encontrada.</p><button type="button" className="mt-3 underline" onClick={reset}>Mostrar todas</button></div>}
      {pageCount > 1 && <nav aria-label="Páginas do catálogo" className="flex items-center justify-center gap-4 pb-5">
        <button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 py-3 font-bold text-[#102a52] disabled:opacity-40">Anterior</button>
        <span className="text-sm font-bold">{currentPage} de {pageCount}</span>
        <button type="button" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 py-3 font-bold text-[#102a52] disabled:opacity-40">Próxima</button>
      </nav>}
    </div>
  );
}

function CatalogCard({ p }: { p: CatalogProduct }) {
  const [details, setDetails] = useState(false);
  const navigate = useNavigate();
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true || access?.level === 1;
  const [showContact, setShowContact] = useState(false);
  const [city, setCity] = useState("");
  const { data: representatives = [], isError: representativesError } = useQuery({
    queryKey: ["public-sales-contacts"],
    enabled: showContact,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("commercial_representatives")
        .select("id,full_name,email,phone").eq("active", true).order("full_name");
      if (error) throw error;
      return (data ?? []).filter((seller) => !!seller.phone);
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["public-representative-regions"],
    enabled: showContact,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("representative_profiles").select("email,region");
      if (error) throw error;
      return data ?? [];
    },
  });
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const matchedRepresentatives = city.trim().length >= 2 ? representatives.filter((seller) =>
    regions.some((region) => region.email?.toLowerCase() === seller.email?.toLowerCase() &&
      normalize(region.region).includes(normalize(city)))
  ) : [];
  function whatsapp(phone: string) {
    const number = phone.replace(/\D/g, "");
    const target = number.length === 10 || number.length === 11 ? "55" + number : number;
    const message = "Olá! Tenho interesse na peça " + p.code + " (" + (p.manufacturer ?? "FCO") + ") do catálogo Netinho Auto Parts. Gostaria de falar com um vendedor sobre a compra. Minha cidade é " + (city.trim() || "não informada") + ".";
    window.open("https://wa.me/" + target + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  }
  function buy() {
    if (!canSell) { setShowContact(true); return; }
    if (p.manufacturer === "HD") { toast.info("HD Embreagens: em breve."); return; }
    const prices = { cash: p.price_cash, "30": p.price_30, "30_45_60": p.price_30_45_60, "30_45_60_75": p.price_30_45_60_75 };
    if (Object.values(prices).every((value) => value == null)) {
      toast.info("Peça sem preço cadastrado. Consulte a distribuidora.");
      void navigate({ to: "/vendas", search: { modo: "venda", q: p.code, promo: "" } });
      return;
    }
    if (p.id.startsWith("fco-campaign-")) {
      void navigate({ to: "/vendas", search: { modo: "venda", q: p.code, promo: p.code } });
      return;
    }
    if (p.localOnly) {
      toast.info("Esta peça ainda não está cadastrada para pedidos. Consulte a distribuidora.");
      void navigate({ to: "/vendas", search: { modo: "venda", q: p.code, promo: "" } });
      return;
    }
    const draft = draftActions.get();
    if (draft.kind === "orcamento" && draft.items.length > 0 && !window.confirm("Transformar o orçamento em andamento em venda?")) return;
    const term = prices[draft.paymentTerm] != null ? draft.paymentTerm : (prices.cash != null ? "cash" : prices["30"] != null ? "30" : prices["30_45_60"] != null ? "30_45_60" : "30_45_60_75");
    draftActions.update({ kind: "pedido", paymentTerm: term });
    draftActions.addItem({ productId: p.id, code: p.code, category: `${brand} · ${p.categories?.name ?? "Peça automotiva"}`, application: p.application ?? "", prices, quantity: 1 });
    toast.success(`Peça ${p.code} adicionada à venda.`);
    void navigate({ to: "/vendas", search: { modo: "venda", q: "", promo: "" } });
  }
  const brand = p.manufacturer ?? "FCO";
  const img = p.image_url || partImage(p.categories?.name);
  const prices = [
    ["À vista", p.price_cash], ["30 dias", p.price_30],
    ["30/45/60 dias", p.price_30_45_60], ["30/45/60/75 dias", p.price_30_45_60_75],
  ] as const;
  return <li className="catalog-product-card surface-card flex min-w-0 flex-col overflow-hidden rounded-2xl p-3">
    <div className="product-visual" aria-label={`Imagem da peça ${p.code}`}>{img ? <img src={img} alt={`Peça ${brand} ${p.code}`} loading="lazy"/> : <PackageSearch size={45} className="text-zinc-400"/>}</div>

    {showContact && <div className="rounded-xl border-2 border-[#a7c1e5] bg-[#f4f8ff] p-3 text-[#102a52]" role="group" aria-label={"Contato para comprar " + p.code}>
      <div className="mb-2 flex items-start justify-between gap-2"><p className="font-extrabold">Deseja comprar a peça {p.code}?</p><button type="button" aria-label="Fechar opções de contato" onClick={() => setShowContact(false)}><X size={20}/></button></div>
      <label htmlFor={"city-" + p.id} className="mb-1 block text-sm font-bold">Qual é a sua cidade?</label>
      <input id={"city-" + p.id} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Digite sua cidade" autoComplete="address-level2" className="mb-3 min-h-12 w-full rounded-lg border border-[#a7c1e5] bg-white px-3 text-[#102a52]" />
      <p className="mb-3 text-sm">Representantes que atendem sua cidade, quando cadastrados. A peça escolhida irá na mensagem.</p>
      {matchedRepresentatives.map((seller) => <button key={seller.id} type="button" onClick={() => whatsapp(seller.phone!)} className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#a7c1e5] bg-white p-2 text-sm font-bold text-[#102a52]"><MessageCircle size={18}/> {seller.full_name}</button>)}
      {city.trim().length >= 2 && matchedRepresentatives.length === 0 && <p className="mb-2 text-sm">Nenhum representante localizado para essa cidade. Consulte o atendimento Netinho.</p>}
      <button type="button" onClick={() => whatsapp("5515992458492")} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#137c45] p-3 text-center text-sm font-extrabold text-white"><MessageCircle size={20}/> Falar com o atendimento Netinho</button>
      {representativesError && <p className="mt-2 text-xs">A lista de representantes não está disponível. Utilize o atendimento Netinho.</p>}
    </div>}
    <div className="flex flex-1 flex-col px-1 pb-2 pt-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-xl font-black text-[#ffdc43]">{p.categories?.name?.replace(/^HD · /, "") || "Peça automotiva"}</h2>
        {canSell && <button type="button" onClick={buy} title={`Adicionar peça ${p.code} ao pedido`} aria-label={`Comprar peça ${p.code}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0677ef] text-white"><ShoppingCart size={23}/></button>}
      </div>
      <button type="button" aria-expanded={details} onClick={() => setDetails(!details)} className="my-3 inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-[#42678b] bg-[#142f4c] px-3 py-2 text-sm font-bold text-[#e5f2ff]"><PackageSearch size={18}/>{details ? "Ocultar aplicações" : "Ver aplicações"}</button>
      {details && <div className="mb-3 space-y-2 rounded-xl border border-[#35536e] bg-[#07182d] p-3 text-sm leading-6">
        <p><strong>Código:</strong> {p.code}</p>
        {p.application && <p><strong>Aplicações:</strong> {p.application}</p>}
        {p.refs && <p><strong>Referências:</strong> {p.refs}</p>}
        {p.catalog_page && <CatalogDownload brand="HD" page={p.catalog_page} className="text-xs underline"/>}
      </div>}
      {canSell && <div className="mt-2 space-y-2">
        <div className="catalog-card-stock">{p.stock > 0 ? `● Em estoque · ${p.stock} un.` : "Estoque sob consulta"}</div>
        <button type="button" onClick={buy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0677ef] px-4 py-2 font-bold text-white"><ShoppingCart size={19}/> Fazer pedido</button>
      </div>}
      {canSell && <div className="mt-auto border-t border-[#b8cee8] pt-3">
        <p className="mb-2 text-sm font-extrabold text-[#102a52]">Valores</p>
        {prices.some(([, price]) => price != null) ? <dl className="space-y-1">{prices.filter(([, price]) => price != null).map(([label, price]) => <div key={label} className="flex justify-between gap-3 text-sm"><dt>{label}</dt><dd className="font-extrabold text-[#102a52]">{brl(price!)}</dd></div>)}</dl> : <p className="text-sm text-muted-foreground">Valor não cadastrado</p>}
      </div>}
    </div>
  </li>;
}
