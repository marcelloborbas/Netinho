import { CatalogDownload } from "@/components/CatalogDownload";
import { customerMinimum } from "@/lib/customer-classes";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  Check,
  ShoppingCart,
  ArrowRight,
  PackageSearch,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { customersQuery, productsQuery, productMatches, type Product } from "@/lib/queries";
import { brl, PAYMENT_TERMS, BRAND, type PaymentTerm } from "@/lib/brand";
import { accessQuery } from "@/lib/access";
import { draftActions, draftTotals, useDraft } from "@/lib/order-store";
import { Button } from "@/components/ui/button";
import { partImage } from "@/lib/part-images";
import { RepresentativeDirectory } from "@/components/RepresentativeDirectory";
import hdCatalog from "@/data/hd-catalog.json";
export const Route = createFileRoute("/_authenticated/catalogo")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { marca?: "FCO" | "HD" | undefined; modo?: "consulta" | "venda" | undefined } => ({
    marca: search["marca"] === "FCO" || search["marca"] === "HD" ? search["marca"] : undefined,
    modo: search["modo"] === "consulta" || search["modo"] === "venda" ? search["modo"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo FCO e HD | Netinho Auto Parts" },
      {
        name: "description",
        content: "Encontre peças por fabricante, código, referência e aplicação.",
      },
    ],
  }),
  component: Catalog,
});
type CatalogProduct = Product & { localOnly?: boolean };
const hdByCode = new Map(hdCatalog.map((p) => [p.code, p]));
const localHd = hdCatalog.map((p) => ({
  id: p.id,
  code: p.code,
  application: p.application,
  refs: [p.name, p.refs].filter(Boolean).join(" · "),
  categories: { name: `HD · ${p.category}` },
  category_id: "hd",
  manufacturer: "HD",
  image_url: p.image,
  catalog_page: p.catalogPage,
  price_cash: null,
  price_30: null,
  price_30_45_60: null,
  price_30_45_60_75: null,
  price_note: null,
  search_text: null,
  stock: 0,
  active: true,
  brand: "HD",
  created_at: "",
  updated_at: "",
  localOnly: true,
})) as CatalogProduct[];
function Catalog() {
  const search = Route.useSearch();
  const [q, setQ] = useState("");
  const [manufacturer, setManufacturer] = useState<string>(search.marca ?? "all");
  const [page, setPage] = useState(1);
  const dq = useDeferredValue(q);
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true && search.modo !== "consulta";
  useEffect(() => {
    setManufacturer(search.marca ?? "all");
    setPage(1);
    setQ("");
  }, [search.marca, search.modo]);
  const { data: products = [], isLoading, error, refetch } = useQuery(productsQuery);
  const { data: customers } = useQuery({ ...customersQuery, enabled: canSell });
  const draft = useDraft();
  const combined = useMemo(
    () => [
      ...products,
      ...localHd.filter(
        (hd) => !products.some((p) => p.manufacturer === "HD" && p.code === hd.code),
      ),
    ],
    [products],
  );
  const list = useMemo(
    () =>
      combined.filter(
        (p) =>
          (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) &&
          productMatches(p, dq),
      ),
    [combined, manufacturer, dq],
  );
  const pageCount = Math.max(1, Math.ceil(list.length / 24));
  const currentPage = Math.min(page, pageCount);
  function reset() {
    setQ("");
    setManufacturer("all");
    setPage(1);
  }
  return (
    <div className={`catalog-workspace ${canSell ? "catalog-workspace-commercial" : ""}`}>
      <div className="catalog-main space-y-6">
        <Link to="/" className="return-button">
          ← Vender ou ver catálogos
        </Link>
        <section className="catalog-hero rounded-2xl border p-5 sm:p-8">
          <div className="flex flex-wrap justify-between gap-5">
            <div>
              <PartnerLogos downloads />
              <p className="official-brands mt-5">Representante Oficial das Marcas</p>
              <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
                A peça certa. Sem perder tempo.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Do código à aplicação, encontre o que precisa com a confiança de quem entende de
                peças.
              </p>
            </div>
          </div>
        </section>
        {canSell ? (
          <section className="surface-card grid items-center gap-4 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <span className="eyebrow">COMECE PELO CLIENTE</span>
              <h2 className="mt-1 text-xl font-bold">Para quem vamos vender?</h2>
            </div>
            <select
              aria-label="Cliente do pedido"
              className="h-12 min-w-0 rounded-lg border bg-secondary px-3 text-sm"
              value={draft.customerId ?? ""}
              onChange={(e) => {
                const c = customers?.find((c) => c.id === e.target.value);
                if (c)
                  draftActions.update({
                    customerId: c.id,
                    customerName: c.trade_name || c.company_name,
                    buyer: c.buyer ?? "",
                    carrier: c.carrier ?? "",
                  });
              }}
            >
              <option value="">Selecione um cliente</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.company_name}
                </option>
              ))}
            </select>
            {customers?.find((c) => c.id === draft.customerId)?.order_class && (
              <p className="text-sm text-amber-400 sm:col-span-3">
                Pedido mínimo do cliente:{" "}
                {brl(
                  customerMinimum(customers?.find((c) => c.id === draft.customerId)?.order_class),
                )}
              </p>
            )}
            <Link to="/clientes" className="classic-button">
              + Novo cliente
            </Link>
          </section>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <p className="text-sm">
              Gostou de uma peça? Consulte valores e condições com seu representante.
            </p>
            <a
              href="#representantes"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary"
            >
              Encontrar representante <ArrowRight size={16} />
            </a>
          </div>
        )}
        <section className="catalog-search space-y-4" aria-label="Busca e filtros do catálogo">
          <label htmlFor="catalog-search" className="block text-lg font-semibold">
            Qual peça você procura?
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-4 text-muted-foreground" size={20} />
              <input
                aria-label="Buscar peças"
                id="catalog-search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Ex.: embreagem, Gol, K6246.HD..."
                className="h-14 w-full rounded-xl border bg-secondary/40 pl-12 pr-12 text-sm"
              />
              {q && (
                <button
                  aria-label="Limpar busca"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  className="absolute right-4 top-4"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Todas as marcas"],
                ["FCO", "FCO Automotive"],
                ["HD", "HD Embreagens"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className="filter-pill"
                  aria-pressed={manufacturer === value}
                  onClick={() => {
                    setManufacturer(value!);
                    setPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {canSell && (
              <select
                aria-label="Condição de pagamento"
                value={draft.paymentTerm}
                onChange={(e) =>
                  draftActions.update({ paymentTerm: e.target.value as PaymentTerm })
                }
                className="h-10 max-w-full rounded-lg border bg-secondary px-3 text-xs"
              >
                {PAYMENT_TERMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-xs text-muted-foreground">
              {list.length} peças encontradas{dq && ` para “${dq}”`} ·{" "}
              {canSell ? "Preços exclusivos da área comercial" : "Catálogo sem exibição de valores"}
            </p>
            {(q || manufacturer !== "all") && (
              <button onClick={reset} className="text-xs font-semibold text-primary">
                Limpar filtros
              </button>
            )}
          </div>
        </section>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm"
          >
            <p>
              Não foi possível carregar o catálogo comercial. As peças HD disponíveis abaixo são
              para consulta.
            </p>
            <button onClick={() => refetch()} className="mt-2 font-bold text-primary">
              Tentar carregar novamente
            </button>
          </div>
        )}
        {isLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            Atualizando catálogo...
          </p>
        )}
        {!list.length ? (
          <div className="surface-card p-12 text-center">
            <PackageSearch className="mx-auto text-primary" size={36} />
            <h2 className="mt-4 text-2xl font-bold">Vamos tentar outra busca?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Busque por outro código ou veículo, ou remova os filtros.
            </p>
            <Button variant="secondary" onClick={reset} className="mt-5">
              Limpar filtros
            </Button>
          </div>
        ) : (
          <ul className="catalog-product-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice((currentPage - 1) * 24, currentPage * 24).map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                term={draft.paymentTerm}
                canSell={canSell}
                inOrder={draft.items.find((i) => i.productId === p.id)?.quantity}
              />
            ))}
          </ul>
        )}
        {pageCount > 1 && (
          <nav aria-label="Páginas do catálogo" className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage} de {pageCount}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              Próxima
            </Button>
          </nav>
        )}
        {!canSell && (
          <div className="border-t pt-8">
            <RepresentativeDirectory />
          </div>
        )}
      </div>
      {canSell && (
        <aside className="catalog-order-summary surface-card" aria-label="Resumo do pedido">
          <div className="flex items-center gap-3">
            <ShoppingCart size={22} className="text-primary" />
            <span className="eyebrow">SEU PEDIDO</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold">Venda em andamento</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {draft.customerName || "Selecione o cliente no catálogo para começar."}
          </p>
          <div className="my-5 border-y py-4" aria-live="polite">
            {draft.items.length ? (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  {draft.items.length} códigos ·{" "}
                  {draft.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                </p>
                <ul className="space-y-3">
                  {draft.items.slice(-4).map((item) => (
                    <li key={item.productId} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words">{item.code}</span>
                      <span className="shrink-0 text-muted-foreground">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                {draft.items.length > 4 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Mais {draft.items.length - 4} códigos na revisão.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                As peças adicionadas aparecem aqui. Seu rascunho é salvo automaticamente.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {PAYMENT_TERMS.find((term) => term.value === draft.paymentTerm)?.label}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm">Total estimado</span>
            <strong className="text-2xl">{brl(draftTotals(draft).net)}</strong>
          </div>
          <Link to="/pedido" className="primary-link mt-5 w-full">
            Revisar pedido <ArrowRight size={17} />
          </Link>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Confira quantidades, condições e descontos antes de enviar.
          </p>
        </aside>
      )}
    </div>
  );
}
function ProductCard({
  p,
  term,
  canSell,
  inOrder,
}: {
  p: CatalogProduct;
  term: PaymentTerm;
  canSell: boolean;
  inOrder?: number | undefined;
}) {
  const [qty, setQty] = useState(1);
  const [details, setDetails] = useState(false);
  const prices = {
    cash: p.price_cash,
    "30": p.price_30,
    "30_45_60": p.price_30_45_60,
    "30_45_60_75": p.price_30_45_60_75,
  };
  const price = prices[term];
  const original = hdByCode.get(p.code);
  const brand = p.manufacturer ?? "FCO";
  const img = p.image_url || partImage(p.categories?.name);
  function add() {
    if (!canSell || p.localOnly || price == null) return;
    if (!draftActions.get().customerId) {
      toast.error("Selecione ou cadastre o cliente primeiro.");
      return;
    }
    draftActions.addItem({
      productId: p.id,
      code: p.code,
      category: `${brand} · ${p.categories?.name ?? ""}`,
      application: p.application,
      prices,
      quantity: qty,
    });
    toast.success(`${p.code} adicionado ao pedido.`);
    setQty(1);
  }
  return (
    <li
      className={`catalog-product-card surface-card flex min-w-0 flex-col p-3 ${inOrder ? "catalog-product-selected" : ""}`}
    >
      <div className="product-visual">
        {img ? (
          <img
            src={img}
            alt={`${p.categories?.name ?? "Peça"} ${brand} ${p.code}`}
            loading="lazy"
          />
        ) : (
          <PackageSearch className="text-zinc-400" size={45} />
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {brand === "HD" ? "HD EMBREAGENS" : "FCO AUTOMOTIVE"}
          </span>
          {canSell && inOrder && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <Check size={15} />
              {inOrder} no pedido
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-bold">
          {p.categories?.name?.replace(/^HD · /, "") || "Peça automotiva"}
        </p>
        <h2 className="mt-1 text-base font-semibold text-muted-foreground">{p.code}</h2>
        <p className={`mt-3 text-sm leading-6 ${details ? "" : "line-clamp-3"}`}>{p.application}</p>
        {details && p.refs && (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Referências: {p.refs}</p>
        )}
        <button
          className="mb-4 mt-2 self-start text-xs font-semibold text-primary"
          aria-expanded={details}
          onClick={() => setDetails(!details)}
        >
          {details ? "Recolher detalhes" : "Aplicações e referências +"}
        </button>
        {details &&
          brand === "HD" &&
          original?.sourceCards.map((card) => (
            <a
              key={card.image}
              href={card.image}
              target="_blank"
              rel="noreferrer"
              className="mb-3 block rounded-lg bg-white p-1"
            >
              <img
                loading="lazy"
                src={card.image}
                alt={`Ficha original ${p.code}, página ${card.page}`}
                className="w-full"
              />
            </a>
          ))}
        {p.catalog_page && (
          <CatalogDownload
            brand="HD"
            page={p.catalog_page}
            className="mb-3 text-xs text-muted-foreground underline"
          />
        )}
        <div className="mt-auto border-t pt-4">
          {canSell && (
            <>
              <div className="mb-3 flex items-end justify-between gap-2">
                <p className="text-2xl font-bold">{price == null ? "Sob consulta" : brl(price)}</p>
                {!p.localOnly && (
                  <span className="text-sm font-bold text-amber-400">
                    {p.stock > 0 ? `${p.stock} em estoque` : "Disponibilidade sob consulta"}
                  </span>
                )}
              </div>
              {p.price_note && (
                <div className="mb-3 text-xs leading-5 text-warning">
                  <p>{p.price_note.split(" Fonte:")[0]}</p>
                  {p.price_note.match(/https:\/\/[^\s]+/) && (
                    <a
                      href={p.price_note.match(/https:\/\/[^\s]+/)?.[0]}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Ver fonte do preço
                    </a>
                  )}
                </div>
              )}
            </>
          )}
          {canSell && !p.localOnly && price != null ? (
            <>
              <div className="mb-3 flex h-11 items-center justify-between rounded-lg border bg-secondary">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-3"
                  aria-label={`Diminuir quantidade de ${p.code}`}
                >
                  <Minus size={15} />
                </button>
                <input
                  aria-label={`Quantidade de ${p.code}`}
                  className="w-16 bg-transparent text-center text-sm"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.min(9999, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                />
                <button
                  onClick={() => setQty(Math.min(9999, qty + 1))}
                  className="p-3"
                  aria-label={`Aumentar quantidade de ${p.code}`}
                >
                  <Plus size={15} />
                </button>
              </div>
              <Button className="h-11 w-full bg-gradient-red" onClick={add}>
                <ShoppingCart size={16} />
                {inOrder ? `Adicionar mais (${inOrder})` : "Adicionar ao pedido"}
              </Button>
            </>
          ) : (
            <a
              href={`https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent(`Olá! Tenho interesse na peça ${brand} ${p.code} (${p.application}). Gostaria de atendimento com o representante da minha região.`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2 text-xs font-bold text-primary"
            >
              Consultar representante <ArrowRight size={15} />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
import { PartnerLogos } from "@/components/PartnerLogos";
