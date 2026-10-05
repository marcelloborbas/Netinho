import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import { Search, Plus, Minus, Check } from "lucide-react";
import { toast } from "sonner";
import { categoriesQuery, productsQuery, productMatches, type Product } from "@/lib/queries";
import { brl, PAYMENT_TERMS, type PaymentTerm } from "@/lib/brand";
import { draftActions, useDraft } from "@/lib/order-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo de produtos – NETINHO" },
      { name: "description", content: "Pesquise peças por código FCO, referência ou veículo." },
      { property: "og:title", content: "Catálogo de produtos – NETINHO" },
      { property: "og:description", content: "Pesquise peças por código FCO, referência ou veículo." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const dq = useDeferredValue(q);
  const { data: products, isLoading, error } = useQuery(productsQuery);
  const { data: cats } = useQuery(categoriesQuery);
  const draft = useDraft();

  const list = useMemo(() => (products ?? []).filter((p) =>
    (!cat || p.category_id === cat) && (!dq.trim() || productMatches(p, dq))), [products, cat, dq]);

  return (
    <div className="space-y-4">
      <div className="sticky top-[61px] z-20 -mx-4 space-y-3 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} inputMode="search"
            placeholder="Código, referência ou veículo (ex: gol 1.0)" className="h-12 pl-10 text-base" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={!cat} onClick={() => setCat(null)}>Todas</Chip>
          {cats?.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
        </div>
        <p className="text-xs text-muted-foreground">
          Preços na condição: <b className="text-foreground">{PAYMENT_TERMS.find((t) => t.value === draft.paymentTerm)?.label}</b>
          {" · "}{list.length} produtos
        </p>
      </div>

      {error && <p className="surface-card p-5 text-sm text-destructive">Erro ao carregar produtos. Verifique a conexão.</p>}
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="surface-card h-32 animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="surface-card p-6 text-center">
          <p className="font-semibold">Nenhum produto encontrado.</p>
          <p className="text-sm text-muted-foreground">Tente pesquisar por código, referência ou veículo.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.slice(0, 120).map((p) => <ProductCard key={p.id} p={p} term={draft.paymentTerm}
            inOrder={draft.items.find((i) => i.productId === p.id)?.quantity} />)}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
      active ? "border-primary bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>{children}</button>
  );
}

function ProductCard({ p, term, inOrder }: { p: Product; term: PaymentTerm; inOrder?: number | undefined }) {
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const prices: Record<PaymentTerm, number | null> = {
    cash: p.price_cash, "30": p.price_30, "30_45_60": p.price_30_45_60, "30_45_60_75": p.price_30_45_60_75,
  };
  const price = prices[term];
  const out = p.stock <= 0;

  function add() {
    draftActions.addItem({ productId: p.id, code: p.code, category: p.categories?.name ?? "",
      application: p.application, prices, quantity: qty });
    toast.success(`${p.code} adicionado (${qty})`);
    setQty(1);
  }

  return (
    <li className="surface-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold tracking-wide">{p.code}</p>
          <p className="text-[11px] uppercase tracking-wider text-metal">{p.categories?.name}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold">{price == null ? "Consulte" : brl(price)}</p>
          <p className={cn("text-xs font-semibold", out ? "text-destructive" : "text-success")}>
            {out ? "Sem estoque" : `Estoque: ${p.stock}`}</p>
        </div>
      </div>
      <p className="text-sm leading-snug">{open ? p.application : p.application.slice(0, 140) + (p.application.length > 140 ? "…" : "")}</p>
      {open && <p className="text-xs text-muted-foreground"><b>Referências:</b> {p.refs}</p>}
      {p.price_note && <p className="text-xs font-semibold text-warning">{p.price_note}</p>}
      <button onClick={() => setOpen(!open)} className="self-start text-xs font-semibold text-primary">
        {open ? "Menos detalhes" : "Ver aplicação e referências"}</button>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border bg-secondary">
          <button aria-label="Diminuir" onClick={() => setQty(Math.max(1, qty - 1))} className="p-3"><Minus className="h-4 w-4" /></button>
          <input aria-label="Quantidade" inputMode="numeric" value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 bg-transparent text-center font-semibold outline-none" />
          <button aria-label="Aumentar" onClick={() => setQty(qty + 1)} className="p-3"><Plus className="h-4 w-4" /></button>
        </div>
        <Button onClick={add} disabled={price == null} className="h-12 flex-1 bg-gradient-red font-semibold">
          {inOrder ? <><Check className="h-4 w-4" /> No pedido ({inOrder}) · +</> : "Adicionar"}
        </Button>
      </div>
      {out && price != null && <p className="text-[11px] text-muted-foreground">Sem estoque — pode ser pedido sob consulta.</p>}
    </li>
  );
}
