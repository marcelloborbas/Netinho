import { CatalogDownload } from "@/components/CatalogDownload";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, PackageSearch, X, ShoppingCart, MessageCircle, Grid2X2, Disc3, Cog, Zap, Filter, Gauge, CarFront, BatteryCharging, CircleDot, Settings2, Heart, GitCompareArrows, History } from "lucide-react";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, categoriesQuery, productMatches, type Product } from "@/lib/queries";
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
type VehicleBrand = { name: string; pattern: RegExp; slug: string; color: string };
const vehicleBrands: VehicleBrand[] = [
  { name: "Volkswagen", pattern: /\bvolkswagen\b|\bvw\b|\bgol\b|\bfox\b|\bpolo\b|\bvoyage\b|\bsaveiro\b/i, slug: "volkswagen", color: "001E50" },
  { name: "Fiat", pattern: /\bfiat\b|\bpalio\b|\buno\b|\bstrada\b|\bargo\b|\bmobi\b/i, slug: "fiat", color: "941711" },
  { name: "Chevrolet", pattern: /\bchevrolet\b|\bchevy\b|\b(onix|ônix|corsa|celta|prisma|spin|s10)\b/i, slug: "chevrolet", color: "D1A24A" },
  { name: "Ford", pattern: /\bford\b|\b(ka|fiesta|ecosport|focus|ranger)\b/i, slug: "ford", color: "002E6B" },
  { name: "Renault", pattern: /\brenault\b|\b(sandero|logan|duster|kwid)\b/i, slug: "renault", color: "FFCC33" },
  { name: "Toyota", pattern: /\btoyota\b|\b(corolla|hilux|etios|yaris)\b/i, slug: "toyota", color: "EB0A1E" },
  { name: "Honda", pattern: /\bhonda\b|\b(civic|fit|hr-v|city)\b/i, slug: "honda", color: "CC0000" },
  { name: "Hyundai", pattern: /\bhyundai\b|\b(hb20|creta|tucson)\b/i, slug: "hyundai", color: "002C5F" },
  { name: "Nissan", pattern: /\bnissan\b|\b(kicks|versa|sentra|march)\b/i, slug: "nissan", color: "C3002F" },
  { name: "Peugeot", pattern: /\bpeugeot\b/i, slug: "peugeot", color: "000000" },
  { name: "Citroën", pattern: /\bcitro[eë]n\b/i, slug: "citroen", color: "AC1926" },
  { name: "Jeep", pattern: /\bjeep\b|\b(renegade|compass)\b/i, slug: "jeep", color: "000000" },
];
function VehicleBrandIcons({ application }: { application?: string | null }) {
  if (!application) return null;
  const matches = vehicleBrands.filter((brand) => brand.pattern.test(application));
  if (!matches.length) return null;
  return <div className="my-2 flex flex-wrap items-center gap-2" aria-label="Montadoras identificadas nas aplicações">
    {matches.map((brand) => <span key={brand.name} title={brand.name} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#102a52]">
      <img src={`https://cdn.simpleicons.org/${brand.slug}/${brand.color}`} alt="" aria-hidden="true" loading="lazy" className="h-6 w-6 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      {brand.name}
    </span>)}
  </div>;
}

const localHd = hdCatalog.map((p) => ({
  id: p.id, code: p.code, application: p.application,
  refs: [p.name, p.refs].filter(Boolean).join(" · "),
  categories: { name: `HD · ${p.category}` }, category_id: "hd",
  manufacturer: "HD", image_url: p.image, catalog_page: p.catalogPage,
  price_cash: null, price_30: null, price_30_45_60: null,
  price_30_45_60_75: null, price_note: null, search_text: null,
  stock: 0, active: true, brand: "HD", created_at: "", updated_at: "", localOnly: true,
})) as CatalogProduct[];

const categoryPhotos: Array<[RegExp, string]> = [
  [/atuador\s*(?:de\s*)?(?:embreagem|hidr[aá]ulic)|atuador.*hidr[aá]ulic/i, "Atuador de Embreagem.webp"],
  [/bobina.*igni/i, "Bobina de Ignição.webp"],
  [/bomba.*dire/i, "Bomba de direção.webp"],
  [/caixa.*dire|dire[cç][aã]o/i, "Caixa de Direção.webp"],
  [/coxim.*amortec/i, "Coxim de Amortecedor.webp"],
  [/corrente.*comando/i, "Kit de corrente de comando.webp"],
  [/kit.*embreagem|embreagem.*kit/i, "Kit de embreagem.webp"],
  [/revestimento/i, "Revestimento.webp"],
  [/rolamento.*embreagem/i, "Rolamento de Embreagem.webp"],
  [/rolamento.*roda/i, "Rolamento de Roda.webp"],
  [/\btbi\b|corpo.*borboleta/i, "TBI.webp"],
  [/turbina|turbo/i, "Turbina.webp"],
];
const displayCategoryName = (name: string) => /^atuador hidr[aá]ulico$/i.test(name.trim()) ? "Atuador e Embreagem" : name;
const categoryPhoto = (name: string) => {
  const filename = categoryPhotos.find(([pattern]) => pattern.test(name))?.[1];
  return filename ? `/images/categorias/${encodeURIComponent(filename)}` : null;
};

function Catalog() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const [manufacturer, setManufacturer] = useState(search.marca === "HD" ? "all" : (search.marca ?? "all"));
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [vehicleBrand, setVehicleBrand] = useState("all");
  const [hasSelectedCategory, setHasSelectedCategory] = useState(false);
  const dq = useDeferredValue(q);
  const [filterOpen, setFilterOpen] = useState(false);
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
    ["menor", "Preço menor"], ["maior", "Preço maior"], ["relevantes", "Relevantes"],
  ] as const;
  const { data: products = [], isLoading, error, refetch } = useQuery(productsQuery);
  const { data: registeredCategories = [], error: categoriesError, refetch: refetchCategories } = useQuery(categoriesQuery);
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true || access?.level === 1;
  const visibleFilterOptions = filterOptions;
  const { data: campaignOffers = [], isLoading: campaignLoading } = useQuery({ queryKey: ["fco-campaign-10-2026"], queryFn: readOffers, staleTime: Infinity });

  useEffect(() => {
    setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all"));
    setQ(search.q ?? "");
    setSearchInput(search.q ?? "");
    setHasSelectedCategory(false);
    setCategory("all");
    setVehicleBrand("all");
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
  const categories = useMemo(() => Array.from(new Set(combined.filter((p) => p.manufacturer !== "HD" && p.active !== false).map((p) => p.categories?.name).filter((n): n is string => typeof n === "string" && n.trim().length > 0))).sort((a, b) => a.localeCompare(b, "pt-BR")), [combined]);
  const categoryCounts = useMemo(() => {
    const eligible = combined.filter((p) => p.active !== false && p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && productMatches(p, dq));
    const counts = new Map<string, number>();
    for (const p of eligible) {
      const name = p.categories?.name;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return { total: eligible.length, counts };
  }, [combined, manufacturer, dq]);
  const availableVehicleBrands = useMemo(() => vehicleBrands.map((brand) => ({ ...brand, count: combined.filter((p) => p.active !== false && p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && brand.pattern.test(p.application ?? "")).length })).filter((brand) => brand.count > 0), [combined, manufacturer]);
  const list = useMemo(() => {
    const matching = combined.filter((p) =>
      p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && (category === "all" || p.categories?.name === category) && (vehicleBrand === "all" || vehicleBrands.find((brand) => brand.name === vehicleBrand)?.pattern.test(p.application ?? "")) && productMatches(p, dq));
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
  }, [combined, manufacturer, category, vehicleBrand, dq, filterMode, favorites, draft.items, recentCodes]);
  const showProducts = hasSelectedCategory || vehicleBrand !== "all" || q.trim().length > 0;
  const pageCount = Math.max(1, Math.ceil(list.length / 24));
  const currentPage = Math.min(page, pageCount);
  const reset = () => { setFilterMode("relevantes"); setQ(""); setSearchInput(""); setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all")); setCategory("all"); setVehicleBrand("all"); setHasSelectedCategory(false); setPage(1); };
  const comparedProducts = compared.map((id) => combined.find((product) => product.id === id)).filter((p): p is CatalogProduct => !!p);
  const categoryIcon = (name: string) => /freio|disco|pastilha/i.test(name) ? Disc3 : /motor|coxim|embreagem/i.test(name) ? Cog : /suspens|amortec/i.test(name) ? Gauge : /elétr|eletr|igni|bobina/i.test(name) ? Zap : /filtro/i.test(name) ? Filter : /direç|direc/i.test(name) ? CarFront : /bateria/i.test(name) ? BatteryCharging : /rolamento/i.test(name) ? CircleDot : Settings2;

  return (
    <div className="catalog-showcase mx-auto w-full max-w-6xl space-y-5 px-3 pt-12 pb-28 sm:px-6 sm:pt-14 sm:pb-32">
      <header className="catalog-showcase-heading mx-auto flex w-full items-center justify-center rounded-2xl border-2 border-[#d4af37] px-4 py-4 text-center shadow-[0_0_0_1px_rgba(212,175,55,0.15)]" style={{ borderColor: "#d4af37", textAlign: "center" }}>
        <h1 className="w-full text-center text-[27px] font-black uppercase leading-tight tracking-wide text-[#102a52] sm:text-[36px]" style={{ textAlign: "center" }}>CATÁLOGO DE PEÇAS</h1>
      </header>

      <section className="space-y-4 rounded-2xl border-2 border-[#102a52] bg-white p-4 shadow-lg" aria-label="Pesquisar catálogo">
        <div className="w-full" role="search">
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3 top-3.5 text-[#174e9b]" size={20} aria-hidden="true" />
            <input id="catalog-search" aria-label="Buscar peças" value={searchInput}
              onChange={(e) => { const value = e.target.value; setSearchInput(value); setQ(value.trim()); setPage(1); }}
              placeholder="Busque pelo código, pela peça ou pelo veículo..."
              style={{ backgroundColor: "#ffffff", color: "#102a52", WebkitTextFillColor: "#102a52" }} className="min-h-12 w-full rounded-xl border-2 border-[#102a52] pl-10 pr-9 text-sm font-semibold placeholder:!text-[#50657d] focus:border-[#facc15] focus:outline-none focus:ring-2 focus:ring-[#facc1540]" />
            {searchInput && <button type="button" aria-label="Limpar busca" onClick={() => { setSearchInput(""); setQ(""); setPage(1); }} className="absolute right-2 top-3.5 text-[#102a52]"><X size={20}/></button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
                        <div className="relative">
              <button type="button" aria-label="Filtros do catálogo" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}
                className="flex items-center gap-1 rounded-lg border-2 border-[#102a52] bg-white px-2.5 py-2 text-[#102a52] hover:bg-[#eaf2ff]">
                <Filter size={19} /><span className="text-xs font-bold">Filtros</span>
              </button>
              {filterOpen && <div className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-[#416c93] bg-[#09213c] p-1 shadow-xl" role="group" aria-label="Ordenar e filtrar peças">
                {visibleFilterOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={filterMode === value}
                  onClick={() => { setFilterMode(value); setPage(1); setFilterOpen(false); }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[#24517b] ${filterMode === value ? "bg-[#21496c] text-[#39ff79]" : "text-white"}`}>{label}</button>)}
              </div>}
            </div>
          </div>
          <button type="button" onClick={() => { reset(); setFilterOpen(false); }} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#102a52] bg-white px-3 py-2 text-xs font-bold text-[#102a52] hover:bg-[#eaf2ff]" aria-label="Limpar filtros do catálogo"><X size={17} aria-hidden="true" />Limpar filtros</button>
        </div>
      </section>

      <p className="mb-2 mt-5 text-sm font-extrabold uppercase tracking-widest text-[#facc15]">Categorias</p><nav className="catalog-category-filters" aria-label="Categorias de peças">
        <div className="catalog-category-item">
          <button type="button" aria-label="Todas as peças" title="Todas as peças" className="category-with-photo !p-0 !overflow-hidden relative" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setHasSelectedCategory(true); setPage(1); }}><img src="/images/categorias/todas%20as%20pe%C3%A7as.webp" alt="Todas as peças" loading="eager" decoding="async" className="catalog-category-photo !w-full !h-full !max-w-none !max-h-none !rounded-none !object-cover" /></button>
          <span className="catalog-category-count">{categoryCounts.total} Itens</span>
        </div>
        {categories.map((name) => {
          const Icon = categoryIcon(name);
          const photo = categoryPhoto(name);
          return <div key={name} className="catalog-category-item">
            <button type="button" aria-label={displayCategoryName(name)} title={displayCategoryName(name)} className={photo ? "category-with-photo !p-0 !overflow-hidden relative" : "relative"} aria-pressed={category === name} onClick={() => { setCategory(name); setHasSelectedCategory(true); setPage(1); }}>
              {photo ? <span className="relative flex h-full w-full items-center justify-center"><Icon size={35} strokeWidth={1.8} aria-hidden="true" className="absolute text-slate-500" /><img src={photo} alt={displayCategoryName(name)} loading="lazy" className="catalog-category-photo relative z-10 !w-full !h-full !max-w-none !max-h-none !rounded-none !object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span> : <Icon size={35} strokeWidth={1.8} aria-hidden="true" />}
            </button>
            <span className="catalog-category-count">{categoryCounts.counts.get(name) ?? 0} Itens</span>
          </div>;
        })}
      </nav>
      <p className="mb-2 mt-4 text-sm font-extrabold uppercase tracking-widest text-[#facc15]">Marcas dos veículos</p>
      <nav aria-label="Filtrar peças por montadora" className="mb-4 flex w-full gap-2 overflow-x-auto pb-2">
        {availableVehicleBrands.map((brand) => <button key={brand.name} type="button" title={`Ver peças para ${brand.name}`} aria-label={`Ver peças para ${brand.name}`} aria-pressed={vehicleBrand === brand.name} onClick={() => { setVehicleBrand(vehicleBrand === brand.name ? "all" : brand.name); setCategory("all"); setHasSelectedCategory(true); setPage(1); }} className={`flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${vehicleBrand === brand.name ? "border-[#facc15] bg-[#fff3bd] text-[#102a52]" : "border-[#9fb2ca] bg-white text-[#102a52]"}`}>
          <img src={`https://cdn.simpleicons.org/${brand.slug}/${brand.color}`} alt="" aria-hidden="true" loading="lazy" className="h-9 w-9 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          <span>{brand.name}</span>
          <span className="text-[10px] opacity-70">{brand.count} peças</span>
        </button>)}
      </nav>
      {categoriesError && <div role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm">Não foi possível carregar todas as categorias. <button type="button" className="font-bold underline" onClick={() => void refetchCategories()}>Tentar novamente</button></div>}
      {error && <div role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm">Não foi possível carregar todas as peças. <button type="button" className="font-bold underline" onClick={() => refetch()}>Tentar novamente</button></div>}
      {(isLoading || campaignLoading) && <p role="status" className="text-sm">Carregando catálogo...</p>}
      {showProducts && (list.length ? (
        <ul className="catalog-product-grid grid grid-cols-1 gap-4">
          {list.slice((currentPage - 1) * 24, currentPage * 24).map((p) => <CatalogCard key={p.id} p={p} isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} isCompared={compared.includes(p.id)} onToggleCompare={() => toggleCompare(p.id)} onView={() => recordViewed(p.code)}/>)}
        </ul>
      ) : !isLoading && <div className="surface-card p-10 text-center"><PackageSearch className="mx-auto text-primary" size={36}/><p className="mt-3 font-bold">Nenhuma peça encontrada.</p><button type="button" className="mt-3 underline" onClick={() => { setCategory("all"); setHasSelectedCategory(true); setPage(1); }}>Mostrar todas</button></div>)}
      {showProducts && pageCount > 1 && <nav aria-label="Páginas do catálogo" className="flex items-center justify-center gap-4 pb-5">
        <button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 py-3 font-bold text-[#102a52] disabled:opacity-40">Anterior</button>
        <span className="text-sm font-bold">{currentPage} de {pageCount}</span>
        <button type="button" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 py-3 font-bold text-[#102a52] disabled:opacity-40">Próxima</button>
      </nav>}
    </div>
  );
}

function CatalogCard({ p, isFavorite, onToggleFavorite, isCompared, onToggleCompare, onView }: { p: CatalogProduct; isFavorite: boolean; onToggleFavorite: () => void; isCompared: boolean; onToggleCompare: () => void; onView: () => void }) {
  const [details, setDetails] = useState(false);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true || access?.level === 1;
  const isAdmin = access?.level === 1;
  const promotionType = /sald[aã]o|liquida[cç][aã]o|queima de estoque/i.test(p.price_note ?? "") ? "saldao" : /oferta|promo[cç][aã]o|campanha/i.test(p.price_note ?? "") ? "oferta" : "normal";
  async function setPromotion(type: "normal" | "oferta" | "saldao") {
    if (!isAdmin || p.localOnly || promotionBusy) return;
    setPromotionBusy(true);
    const note = type === "normal" ? null : type === "oferta" ? "Oferta" : "Saldão";
    const { error } = await supabase.from("products").update({ price_note: note }).eq("id", p.id);
    setPromotionBusy(false);
    if (error) { toast.error("Não foi possível atualizar a campanha: " + error.message); return; }
    await qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(type === "normal" ? "Campanha removida." : "Produto marcado como " + (type === "oferta" ? "Oferta" : "Saldão") + ".");
  }
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
  const img = p.image_url || categoryPhoto(p.categories?.name ?? "") || partImage(p.categories?.name);
    return <li className="catalog-product-card surface-card grid min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl p-3 sm:grid-cols-[minmax(150px,28%)_minmax(0,1fr)]">
    <div className="relative catalog-card-image-col"><button type="button" onClick={onToggleFavorite} aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={isFavorite} className="absolute right-2 top-2 z-10 rounded-full bg-[#09213c] p-2 text-[#39ff79] shadow-lg"><Heart size={19} fill={isFavorite ? "currentColor" : "none"} /></button><div className="product-visual" aria-label={`Imagem da peça ${p.code}`}>{img ? <img src={img} alt={`Peça ${brand} ${p.code}`} loading="lazy"/> : <PackageSearch size={45} className="text-zinc-400"/>}</div></div>

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
    <div className="catalog-card-info flex min-w-0 flex-1 flex-col px-1 pb-2 pt-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-2xl sm:text-3xl font-black text-[#102a52]">{displayCategoryName(p.categories?.name?.replace(/^HD · /, "") || "Peça automotiva")}</h2>
      </div>
      <VehicleBrandIcons application={p.application} />
      
      <div className="my-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={details} onClick={() => { if (!details) onView(); setDetails(!details); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#42678b] bg-[#142f4c] px-3 py-2 text-sm font-bold text-[#e5f2ff]"><PackageSearch size={18}/>{details ? "Fechar ficha técnica" : "Ficha técnica"}</button>
        <button type="button" onClick={buy} aria-label={canSell ? "Adicionar peça à venda" : "Consultar compra da peça"} title={canSell ? "Adicionar à venda" : "Consultar compra"} className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#2588f9] bg-[#0878ed] px-3 py-2 text-sm font-bold text-white shadow-sm"><ShoppingCart size={20} aria-hidden="true" /><span className="sr-only">Comprar</span></button>
      </div>
      {details && <div className="mb-3 space-y-2 rounded-xl border border-[#102a52] bg-[#f1f1f1] p-3 text-sm leading-6 text-[#102a52]" style={{ backgroundColor: "var(--netinho-page-bg, #f1f1f1)", color: "#102a52" }}>
        <p><strong>Código:</strong> {p.code}</p>
        <p><strong>Fabricante:</strong> {p.manufacturer || "Não informado"}</p>
        <p><strong>Categoria:</strong> {displayCategoryName(p.categories?.name || "Não informada")}</p>
        {p.application && <p><strong>Aplicações:</strong> {p.application}</p>}
        {p.refs && <p><strong>Referências:</strong> {p.refs}</p>}
        <p className="text-xs text-[#102a52]">Confira a aplicação e as referências com o fabricante antes de confirmar a compra.</p>
        {p.catalog_page && <CatalogDownload brand="HD" page={p.catalog_page} className="text-xs underline"/>}
      </div>}
      {canSell && <div className="mt-2 space-y-2">
        <div className="catalog-card-stock">{p.stock > 0 ? `● Estoque = ${p.stock} un.` : "Estoque não informado"}</div>
      </div>}
      <div className="mt-auto pt-3">
        <div className="catalog-price-highlight flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#d4af37] bg-[#102a52] px-4 py-3 shadow-md"><span className="text-base font-extrabold text-[#f4cf60]">{p.price_cash != null ? "Preço à vista:" : "Preço disponível:"}</span>{p.price_cash != null ? <strong className="text-2xl font-black text-[#f4cf60]">{brl(p.price_cash)}</strong> : <span className="text-sm font-semibold text-[#f4cf60]">{p.price_30 != null ? `30 dias: ${brl(p.price_30)}` : p.price_30_45_60 != null ? `30/45/60 dias: ${brl(p.price_30_45_60)}` : p.price_30_45_60_75 != null ? `30/45/60/75 dias: ${brl(p.price_30_45_60_75)}` : "Sob consulta"}</span>}</div>
      </div>
    </div>
  </li>;
}
