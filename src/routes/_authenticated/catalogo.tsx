import { CatalogDownload } from "@/components/CatalogDownload";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, PackageSearch, X, ShoppingCart, MessageCircle, Grid2X2, Disc3, Cog, Zap, Filter, Gauge, CarFront, BatteryCharging, CircleDot, Settings2, Heart, GitCompareArrows, Car, History, Tag, RotateCcw } from "lucide-react";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, productMatches, type Product } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { draftActions, useDraft } from "@/lib/order-store";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleEngine, setVehicleEngine] = useState("");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [compared, setCompared] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [recentCodes, setRecentCodes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("netinho-recent-products") || "[]") as string[]; }
    catch { return []; }
  });
  const recordViewed = (code: string) => setRecentCodes((previous) => {
    const next = [code, ...previous.filter((item) => item !== code)].slice(0, 12);
    try { localStorage.setItem("netinho-recent-products", JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  const toggleCompare = (id: string) => setCompared((previous) => {
    if (previous.includes(id)) return previous.filter((item) => item !== id);
    if (previous.length >= 3) { toast.info("Compare até 3 peças por vez."); return previous; }
    return [...previous, id];
  });
  const [filterMode, setFilterMode] = useState("relevantes");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("netinho-catalog-favorites") || "[]") as string[]; }
    catch { return []; }
  });
  const draft = useDraft();
  const toggleFavorite = (id: string) => {
    setFavorites((previous) => {
      const next = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id];
      try { localStorage.setItem("netinho-catalog-favorites", JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const filterOptions = [
    ["menor", "Menor R$"], ["maior", "Maior R$"], ["saldao", "Saldão"],
    ["relevantes", "Relevantes"], ["ofertas", "Ofertas"],
    ["compras", "Compras"], ["favoritos", "Favoritos"], ["disponiveis", "Disponíveis"], ["recentes", "Vistos recentemente"],
  ] as const;
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
  const vehicleTerms = [vehicleMake, vehicleModel, vehicleYear, vehicleEngine].map((term) => term.trim()).filter(Boolean);
  const vehicleActive = vehicleTerms.length > 0;
  const list = useMemo(() => {
    const matching = combined.filter((p) =>
      p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && (category === "all" || p.categories?.name === category) && productMatches(p, dq) && (!vehicleActive || vehicleTerms.every((term) => productMatches(p, term))));
    const selected = matching.filter((p) => {
      if (filterMode === "recentes") return recentCodes.includes(p.code);
      if (filterMode === "disponiveis") return p.stock > 0;
      if (filterMode === "favoritos") return favorites.includes(p.id);
      if (filterMode === "compras") return draft.items.some((item) => item.productId === p.id);
      if (filterMode === "ofertas") return /oferta|promo[cç][aã]o|campanha/i.test(p.price_note ?? "");
      if (filterMode === "saldao") return /sald[aã]o|liquida[cç][aã]o|queima de estoque/i.test(p.price_note ?? "");
      return true;
    });
    if (filterMode === "menor" || filterMode === "maior") {
      return [...selected].sort((a, b) => {
        const aPrice = a.price_cash, bPrice = b.price_cash;
        if (aPrice == null) return 1;
        if (bPrice == null) return -1;
        return filterMode === "menor" ? aPrice - bPrice : bPrice - aPrice;
      });
    }
    if (filterMode === "recentes") return [...selected].sort((a, b) => recentCodes.indexOf(a.code) - recentCodes.indexOf(b.code));
    return selected;
  }, [combined, manufacturer, category, dq, filterMode, favorites, draft.items, recentCodes, vehicleMake, vehicleModel, vehicleYear, vehicleEngine]);
  const pageCount = Math.max(1, Math.ceil(list.length / 24));
  const currentPage = Math.min(page, pageCount);
  const reset = () => { setVehicleMake(""); setVehicleModel(""); setVehicleYear(""); setVehicleEngine(""); setFilterMode("relevantes"); setQ(""); setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all")); setCategory("all"); setPage(1); };
  const comparedProducts = compared.map((id) => combined.find((product) => product.id === id)).filter((p): p is CatalogProduct => !!p);
  const categoryIcon = (name: string) => /freio|disco|pastilha/i.test(name) ? Disc3 : /motor|coxim|embreagem/i.test(name) ? Cog : /suspens|amortec/i.test(name) ? Gauge : /elétr|eletr|igni|bobina/i.test(name) ? Zap : /filtro/i.test(name) ? Filter : /direç|direc/i.test(name) ? CarFront : /bateria/i.test(name) ? BatteryCharging : /rolamento/i.test(name) ? CircleDot : Settings2;

  return (
    <div className="catalog-showcase mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-6">
      <header className="catalog-showcase-heading rounded-2xl border border-[#33577b] bg-gradient-to-br from-[#06172c] via-[#102e51] to-[#081b33] px-4 py-5 text-center text-white shadow-lg">
        <h1 className="text-[28px] font-black leading-tight tracking-tight text-white sm:text-[34px]">Catálogo de <span className="text-[#ffd54f]">Peças</span></h1><p className="mt-1 text-xs font-medium text-blue-100">Encontre a peça certa para seu veículo</p>

      </header>

      <section className="space-y-3 rounded-2xl border border-[#31587f] bg-[#0b2745] p-4 shadow-lg" aria-label="Buscar por veículo">
        <button type="button" aria-expanded={vehicleOpen} onClick={() => setVehicleOpen(!vehicleOpen)} className="flex w-full items-center justify-between gap-3 text-left font-extrabold text-[#39ff79]"><span className="inline-flex items-center gap-2"><Car size={21}/> Buscar por veículo</span><span className="text-xs text-white">{vehicleOpen ? "Fechar −" : "Abrir +"}</span></button>
        {vehicleOpen && <div className="space-y-3">
          <p className="text-xs text-blue-100">Pesquisa os dados de aplicação cadastrados pelo fabricante. Confirme a compatibilidade na ficha técnica antes de comprar.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["Montadora", vehicleMake, setVehicleMake], ["Modelo", vehicleModel, setVehicleModel], ["Ano", vehicleYear, setVehicleYear], ["Motorização", vehicleEngine, setVehicleEngine]] as const).map(([label, value, setter]) => <label key={label} className="space-y-1 text-xs font-bold text-white">{label}<input type="text" value={value} onChange={(e) => { setter(e.target.value); setPage(1); }} placeholder={label} className="min-h-11 w-full rounded-lg border border-[#40698e] bg-[#071b31] px-3 text-sm text-white placeholder:text-slate-300" /></label>)}
          </div>
          <button type="button" onClick={() => { setVehicleMake(""); setVehicleModel(""); setVehicleYear(""); setVehicleEngine(""); setPage(1); }} className="inline-flex items-center gap-2 text-xs font-bold text-[#facc15]"><RotateCcw size={15}/> Limpar veículo</button>
        </div>}
      </section>
      <section className="space-y-4 rounded-2xl border border-[#31587f] bg-[#0b2745] p-4 shadow-lg" aria-label="Pesquisar catálogo">
        <div className="relative">
          <Search className="absolute left-4 top-4 text-[#8bc8ff]" size={20} aria-hidden="true" />
          <input id="catalog-search" aria-label="Buscar peças" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Busque por código, peça, veículo ou aplicação"
            className="h-13 min-h-12 w-full rounded-xl border border-[#40698e] bg-[#071b31] pl-12 pr-12 text-sm text-white placeholder:text-slate-300 focus:border-[#facc15] focus:outline-none focus:ring-2 focus:ring-[#facc1540]" />
          {q && <button type="button" aria-label="Limpar busca" onClick={() => { setQ(""); setPage(1); }} className="absolute right-4 top-3.5 text-white"><X size={20}/></button>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p role="status" className="text-sm font-semibold text-[#dbeafe]">{list.length} peças encontradas</p>
            <div className="relative">
              <button type="button" aria-label="Filtros do catálogo" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}
                className="flex items-center gap-1 rounded-lg border border-[#4b779f] bg-[#123b63] px-2.5 py-2 text-[#39ff79] hover:bg-[#1c4d78]">
                <Filter size={19} /><span className="text-xs font-bold">Filtros</span>
              </button>
              {filterOpen && <div className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-[#416c93] bg-[#09213c] p-1 shadow-xl" role="group" aria-label="Ordenar e filtrar peças">
                {filterOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={filterMode === value}
                  onClick={() => { setFilterMode(value); setPage(1); setFilterOpen(false); }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[#24517b] ${filterMode === value ? "bg-[#21496c] text-[#39ff79]" : "text-white"}`}>{label}</button>)}
              </div>}
            </div>
          </div>
          {(q || vehicleActive || manufacturer !== "all" || category !== "all" || filterMode !== "relevantes") && <button type="button" onClick={reset} className="text-sm font-bold text-[#facc15] underline">Limpar filtros</button>}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/pedidos" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#42678b] bg-[#102e51] px-3 font-bold text-white"><History size={17}/> Histórico de pedidos</Link>
        <Link to="/vendas" search={{ modo: "venda", q: "", promo: "" }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#42678b] bg-[#102e51] px-3 font-bold text-white"><ShoppingCart size={17}/> Pedido rápido</Link>
        {compared.length > 0 && <button type="button" onClick={() => setCompareOpen(!compareOpen)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#39ff79] bg-[#102e51] px-3 font-bold text-[#39ff79]"><GitCompareArrows size={17}/> Comparar ({compared.length})</button>}
      </div>
      {compareOpen && comparedProducts.length > 0 && <section aria-label="Comparação de peças" className="overflow-x-auto rounded-xl border border-[#42678b] bg-[#0b2745] p-3 text-white">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-extrabold text-[#39ff79]">Comparar peças</h2><button type="button" onClick={() => setCompared([])} className="text-xs underline">Limpar comparação</button></div>
        <table className="w-full min-w-[420px] border-collapse text-left text-xs"><thead><tr><th className="p-2">Característica</th>{comparedProducts.map((p) => <th key={p.id} className="p-2 text-[#39ff79]">{p.code}</th>)}</tr></thead><tbody>
          {([["Peça", (p: CatalogProduct) => p.categories?.name || "—"], ["Fabricante", (p: CatalogProduct) => p.manufacturer || "—"], ["Aplicação", (p: CatalogProduct) => p.application || "Não informada"], ["Referências", (p: CatalogProduct) => p.refs || "Não informadas"], ["À vista", (p: CatalogProduct) => p.price_cash == null ? "Não informado" : brl(p.price_cash)]] as const).map(([label, getter]) => <tr key={label} className="border-t border-[#35536e]"><th className="p-2 align-top">{label}</th>{comparedProducts.map((p) => <td key={p.id} className="p-2 align-top">{getter(p)}</td>)}</tr>)}
        </tbody></table>
      </section>}
      <p className="mb-2 mt-5 text-sm font-extrabold uppercase tracking-widest text-[#facc15]">Categorias</p><nav className="catalog-category-filters" aria-label="Categorias de peças">
        <button type="button" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setPage(1); }}><Grid2X2 size={20}/><span>Todas<br />as peças</span></button>
        {categories.map((name) => { const Icon = categoryIcon(name); const photo = /caixa.*dire[cç][aã]o|dire[cç][aã]o/i.test(name) ? "/images/campaign/Caixa-de-direcao-mecanica-fiat-strada-2000-ate-2013.webp" : partImage(name); return <button key={name} type="button" className={photo ? "category-with-photo" : ""} style={photo ? { backgroundImage: `linear-gradient(#07192b55,#07192b55),url("${photo}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} aria-pressed={category === name} onClick={() => { setCategory(name); setPage(1); }}>{photo ? <img src={photo} alt="" loading="lazy" className="h-12 w-14 rounded-lg object-contain" /> : <Icon size={35} strokeWidth={1.8} aria-hidden="true" />}<span>{name.trim().split(/\s+/).length > 1 ? <>{name.trim().split(/\s+/)[0]}<br />{name.trim().split(/\s+/).slice(1).join(" ")}</> : <>{name}<br />&nbsp;</>}</span></button>; })}
      </nav>
      {error && <div role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm">Não foi possível carregar todas as peças. <button type="button" className="font-bold underline" onClick={() => refetch()}>Tentar novamente</button></div>}
      {(isLoading || campaignLoading) && <p role="status" className="text-sm">Carregando catálogo...</p>}
      {list.length ? (
        <ul className="catalog-product-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.slice((currentPage - 1) * 24, currentPage * 24).map((p) => <CatalogCard key={p.id} p={p} isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} isCompared={compared.includes(p.id)} onToggleCompare={() => toggleCompare(p.id)} onView={() => recordViewed(p.code)}/>)}
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

function CatalogCard({ p, isFavorite, onToggleFavorite, isCompared, onToggleCompare, onView }: { p: CatalogProduct; isFavorite: boolean; onToggleFavorite: () => void; isCompared: boolean; onToggleCompare: () => void; onView: () => void }) {
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
  const img = p.image_url || (/caixa.*dire[cç][aã]o|dire[cç][aã]o/i.test(p.categories?.name ?? "") ? "/images/campaign/Caixa-de-direcao-mecanica-fiat-strada-2000-ate-2013.webp" : partImage(p.categories?.name));
  const prices = [
    ["À vista", p.price_cash], ["30 dias", p.price_30],
    ["30/45/60 dias", p.price_30_45_60], ["30/45/60/75 dias", p.price_30_45_60_75],
  ] as const;
  return <li className="catalog-product-card surface-card flex min-w-0 flex-col overflow-hidden rounded-2xl p-3">
    <div className="relative"><button type="button" onClick={onToggleFavorite} aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={isFavorite} className="absolute right-2 top-2 z-10 rounded-full bg-[#09213c] p-2 text-[#39ff79] shadow-lg"><Heart size={19} fill={isFavorite ? "currentColor" : "none"} /></button><div className="product-visual" aria-label={`Imagem da peça ${p.code}`}>{img ? <img src={img} alt={`Peça ${brand} ${p.code}`} loading="lazy"/> : <PackageSearch size={45} className="text-zinc-400"/>}</div></div>

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
        <h2 className="min-w-0 flex-1 text-xl font-black text-[#39ff79] drop-shadow-[0_0_5px_rgba(57,255,121,0.45)]">{p.categories?.name?.replace(/^HD · /, "") || "Peça automotiva"}</h2>
        {canSell && <button type="button" onClick={buy} title={`Adicionar peça ${p.code} ao pedido`} aria-label={`Comprar peça ${p.code}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0677ef] text-white"><ShoppingCart size={23}/></button>}
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={isCompared} onClick={onToggleCompare} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold ${isCompared ? "border-[#39ff79] bg-[#163d52] text-[#39ff79]" : "border-[#42678b] bg-[#142f4c] text-white"}`}><GitCompareArrows size={17}/>{isCompared ? "Selecionada" : "Comparar"}</button></div>
      <button type="button" aria-expanded={details} onClick={() => { if (!details) onView(); setDetails(!details); }} className="my-3 inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-[#42678b] bg-[#142f4c] px-3 py-2 text-sm font-bold text-[#e5f2ff]"><PackageSearch size={18}/>{details ? "Fechar ficha técnica" : "Ficha técnica"}</button>
      {details && <div className="mb-3 space-y-2 rounded-xl border border-[#35536e] bg-[#07182d] p-3 text-sm leading-6">
        <p><strong>Código:</strong> {p.code}</p>
        <p><strong>Fabricante:</strong> {p.manufacturer || "Não informado"}</p>
        <p><strong>Categoria:</strong> {p.categories?.name || "Não informada"}</p>
        {p.application && <p><strong>Aplicações:</strong> {p.application}</p>}
        {p.refs && <p><strong>Referências:</strong> {p.refs}</p>}
        <p className="text-xs text-blue-100">Confira a aplicação e as referências com o fabricante antes de confirmar a compra.</p>
        {p.catalog_page && <CatalogDownload brand="HD" page={p.catalog_page} className="text-xs underline"/>}
      </div>}
      {canSell && <div className="mt-2 space-y-2">
        <div className="catalog-card-stock">{p.stock > 0 ? `● Em estoque · ${p.stock} un.` : "Estoque não informado"}</div>
        <button type="button" onClick={buy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0677ef] px-4 py-2 font-bold text-white"><ShoppingCart size={19}/> Fazer pedido</button>
      </div>}
      <div className="mt-auto border-t border-[#35536e] pt-3">
        <p className="mb-2 text-sm font-extrabold text-white">{canSell ? "Valores" : "Preço à vista"}</p>
        {(canSell ? prices : prices.filter(([label]) => label === "À vista")).some(([, price]) => price != null) ? <dl className="space-y-1">{(canSell ? prices : prices.filter(([label]) => label === "À vista")).filter(([, price]) => price != null).map(([label, price]) => <div key={label} className="flex justify-between gap-3 text-sm text-white"><dt>{label}</dt><dd className="font-extrabold text-[#39ff79] drop-shadow-[0_0_5px_rgba(57,255,121,0.45)]">{brl(price!)}</dd></div>)}</dl> : null}
      </div>
    </div>
  </li>;
}
