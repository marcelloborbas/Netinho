import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, productsQuery, productMatches, type Product } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração – NETINHO" }, { name: "description", content: "Gestão de produtos, estoque e preços." },
    { property: "og:title", content: "Administração – NETINHO" }, { property: "og:description", content: "Gestão de produtos, estoque e preços." }] }),
  component: Admin,
});

function Admin() {
  const { data: me, isLoading } = useQuery(meQuery);
  const { data: products } = useQuery(productsQuery);
  const [q, setQ] = useState("");
  const list = useMemo(() => (products ?? []).filter((p) => !q || productMatches(p, q)).slice(0, 60), [products, q]);

  if (isLoading) return null;
  if (!me?.isAdmin) return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold uppercase">Administração</h1>
      <p className="text-sm text-muted-foreground">Todos os pedidos dos vendedores aparecem em “Pedidos”, onde você também altera o status.</p>
      <h2 className="text-xl font-bold uppercase">Produtos, estoque e preços</h2>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className="h-12" />
      <ul className="space-y-2">{list.map((p) => <ProductEditor key={p.id} p={p} />)}</ul>
    </div>
  );
}

const PRICE_FIELDS = [["price_cash", "À vista"], ["price_30", "30"], ["price_30_45_60", "30/45/60"], ["price_30_45_60_75", "30/45/60/75"]] as const;

function ProductEditor({ p }: { p: Product }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ stock: String(p.stock), ...Object.fromEntries(PRICE_FIELDS.map(([k]) => [k, p[k]?.toString() ?? ""])) } as Record<string, string>);
  const [busy, setBusy] = useState(false);
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function save(extra?: { active: boolean }) {
    setBusy(true);
    const { error } = await supabase.from("products").update({
      stock: parseInt(v.stock) || 0, price_cash: num(v.price_cash), price_30: num(v.price_30),
      price_30_45_60: num(v.price_30_45_60), price_30_45_60_75: num(v.price_30_45_60_75), ...extra,
    }).eq("id", p.id);
    setBusy(false);
    if (error) toast.error("Erro ao salvar"); else { toast.success(`${p.code} atualizado`); qc.invalidateQueries({ queryKey: ["products"] }); }
  }

  return (
    <li className="surface-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="font-display text-lg font-bold">{p.code}</p>
          <p className="truncate text-xs text-muted-foreground">{p.application}</p></div>
        <label className="flex items-center gap-2 text-xs">Ativo <Switch checked={p.active} onCheckedChange={(a) => save({ active: a })} /></label>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="text-xs text-muted-foreground">Estoque<Input value={v.stock} inputMode="numeric" onChange={(e) => setV({ ...v, stock: e.target.value })} /></label>
        {PRICE_FIELDS.map(([k, l]) => (
          <label key={k} className="text-xs text-muted-foreground">{l}<Input value={v[k]} inputMode="decimal" onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
        ))}
      </div>
      <Button size="sm" disabled={busy} onClick={() => save()} className="bg-gradient-red">Salvar</Button>
    </li>
  );
}
