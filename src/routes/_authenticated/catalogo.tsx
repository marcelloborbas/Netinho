import { CatalogDownload } from "@/components/CatalogDownload";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, PackageSearch, X } from "lucide-react";
import { productsQuery, productMatches, type Product } from "@/lib/queries";
import { brl } from "@/lib/brand";
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
  const [manufacturer, setManufacturer] = useState(search.marca ?? "all");
  const [page, setPage] = useState(1);
  const dq = useDeferredValue(q);
  const { data: products = [], isLoading, error, refetch } = useQuery(productsQuery);
  const { data: campaignOffers = [], isLoading: campaignLoading } = useQuery({ queryKey: ["fco-campaign-10-2026"], queryFn: readOffers, staleTime: Infinity });

  useEffect(() => {
    setManufacturer(search.marca ?? "all");
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
  const list = useMemo(() => combined.filter((p) =>
    (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && productMatches(p, dq),
  ), [combined, manufacturer, dq]);
  const pageCount = Math.max(1, Math.ceil(list.length / 24));
  const currentPage = Math.min(page, pageCount);
  const reset = () => { setQ(""); setManufacturer("all"); setPage(1); };

  return (
    <div className="catalog-showcase mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-6">
      <header className="catalog-showcase-heading rounded-2xl border border-[#b8cee8] bg-[#edf4ff] px-4 py-5 text-center text-[#102a52] shadow-sm">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">Catálogo de Peças</h1>
        <p className="mt-2 text-sm">Todas as peças FCO e HD, com aplicações, referências e valores disponíveis.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm" aria-label="Pesquisar catálogo">
        <nav aria-label="Selecionar fabricante" className="grid grid-cols-3 gap-2">
          {([["all", "Geral"], ["FCO", "FCO"], ["HD", "HD"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={manufacturer === value}
              className={`min-h-12 rounded-xl border px-2 text-base font-extrabold shadow-sm transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${manufacturer === value ? (value === "all" ? "border-[#174e9b] bg-[#174e9b] text-white" : "border-[#174e9b] bg-white text-[#102a52] ring-2 ring-[#174e9b] ring-inset") : "border-[#a7c1e5] bg-[#eaf2ff] text-[#102a52] hover:bg-[#dbeafe]"}`}
              onClick={() => { setManufacturer(value); setPage(1); }}>{value === "all" ? label : <img src={value === "FCO" ? "/images/brands/fco.webp" : "/images/brands/hd.png"} alt={`Logomarca ${label}`} className="mx-auto h-9 w-full max-w-28 object-contain" />}</button>
          ))}
        </nav>
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
          {(q || manufacturer !== "all") && <button type="button" onClick={reset} className="text-sm font-bold text-[#174e9b] underline">Limpar filtros</button>}
        </div>
      </section>

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
  const brand = p.manufacturer ?? "FCO";
  const img = p.image_url || partImage(p.categories?.name);
  const prices = [
    ["À vista", p.price_cash], ["30 dias", p.price_30],
    ["30/45/60 dias", p.price_30_45_60], ["30/45/60/75 dias", p.price_30_45_60_75],
  ] as const;
  return <li className="catalog-product-card surface-card flex min-w-0 flex-col overflow-hidden rounded-2xl p-3">
    <div className="product-visual">{img ? <img src={img} alt={`Peça ${brand} ${p.code}`} loading="lazy"/> : <PackageSearch size={45} className="text-zinc-400"/>}</div>
    <div className="flex flex-1 flex-col px-1 pb-2 pt-4">
      <span className="text-xs font-extrabold uppercase tracking-wider text-[#174e9b]">{brand === "HD" ? "HD Embreagens" : "FCO Automotive"}</span>
      <h2 className="mt-2 text-lg font-extrabold">{p.categories?.name?.replace(/^HD · /, "") || "Peça automotiva"}</h2>
      <p className="mt-1 text-base font-bold text-muted-foreground">Código: {p.code}</p>
      <p className={`mt-3 text-sm leading-6 ${details ? "" : "line-clamp-3"}`}>{p.application}</p>
      {details && p.refs && <p className="mt-2 text-sm text-muted-foreground">Referências: {p.refs}</p>}
      <button type="button" aria-expanded={details} onClick={() => setDetails(!details)} className="my-3 self-start text-sm font-bold text-[#174e9b] underline">{details ? "Ocultar detalhes" : "Ver aplicações e referências"}</button>
      {p.catalog_page && <CatalogDownload brand="HD" page={p.catalog_page} className="mb-3 text-xs underline"/>}
      <div className="mt-auto border-t border-[#b8cee8] pt-3">
        <p className="mb-2 text-sm font-extrabold text-[#102a52]">Valores</p>
        {prices.some(([, price]) => price != null) ? <dl className="space-y-1">{prices.filter(([, price]) => price != null).map(([label, price]) => <div key={label} className="flex justify-between gap-3 text-sm"><dt>{label}</dt><dd className="font-extrabold text-[#102a52]">{brl(price!)}</dd></div>)}</dl> : <p className="text-sm text-muted-foreground">Valor não cadastrado</p>}
      </div>
    </div>
  </li>;
}
