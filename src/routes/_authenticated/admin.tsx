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
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },{ title: "Administração – NETINHO" }, { name: "description", content: "Gestão de produtos, estoque e preços." },
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
      <RepresentativesAdmin />
      <h2 className="text-xl font-bold uppercase">Produtos, estoque e preços</h2>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className="h-12" />
      <ul className="space-y-2">{list.map((p) => <ProductEditor key={p.id} p={p} />)}</ul>
    </div>
  );
}

const PRICE_FIELDS = [["price_cash", "À vista"], ["price_30", "30"], ["price_30_45_60", "30/45/60"], ["price_30_45_60_75", "30/45/60/75"]] as const;

function ProductEditor({ p }: { p: Product }) {
  const qc = useQueryClient();
  type F = "stock" | (typeof PRICE_FIELDS)[number][0];
  const [v, setV] = useState<Record<F, string>>({ stock: String(p.stock), price_cash: p.price_cash?.toString() ?? "",
    price_30: p.price_30?.toString() ?? "", price_30_45_60: p.price_30_45_60?.toString() ?? "", price_30_45_60_75: p.price_30_45_60_75?.toString() ?? "" });
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

type Representative = { id: string; user_id: string | null; full_name: string; email: string; phone: string | null; active: boolean };

function RepresentativesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: representatives = [], isLoading, error } = useQuery({
    queryKey: ["commercial-representatives"],
    queryFn: async () => {
      const result = await supabase.from("commercial_representatives" as never).select("*").order("full_name");
      if (result.error) throw result.error;
      return (result.data ?? []) as Representative[];
    },
  });

  async function createRepresentative(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await supabase.from("commercial_representatives" as never).insert({
      full_name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null, active: false,
    } as never);
    setBusy(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success("Representante cadastrado como inativo. Vincule uma conta autenticada antes de ativá-lo.");
    setName(""); setEmail(""); setPhone("");
    qc.invalidateQueries({ queryKey: ["commercial-representatives"] });
  }

  async function editRepresentative(rep: Representative) {
    const fullName = window.prompt("Nome completo do representante:", rep.full_name);
    if (fullName === null) return;
    if (!fullName.trim()) { toast.error("O nome é obrigatório."); return; }
    const email = window.prompt("E-mail do representante:", rep.email);
    if (email === null) return;
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())) { toast.error("E-mail inválido."); return; }
    const phone = window.prompt("Telefone do representante:", rep.phone ?? "");
    if (phone === null) return;
    const result = await supabase.from("commercial_representatives" as never)
      .update({ full_name: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null } as never)
      .eq("id", rep.id);
    if (result.error) toast.error(result.error.message);
    else { toast.success("Representante atualizado."); qc.invalidateQueries({ queryKey: ["commercial-representatives"] }); }
  }

  async function toggle(rep: Representative) {
    if (!rep.user_id && !rep.active) {
      toast.error("Vincule primeiro a conta autenticada do representante.");
      return;
    }
    const result = await supabase.from("commercial_representatives" as never)
      .update({ active: !rep.active } as never).eq("id", rep.id);
    if (result.error) toast.error(result.error.message);
    else { toast.success("Situação atualizada."); qc.invalidateQueries({ queryKey: ["commercial-representatives"] }); }
  }

  return (
    <section id="representantes" className="surface-card space-y-4 p-4">
      <h2 className="text-xl font-bold">Cadastro de Representantes Comerciais</h2>
      <p className="text-sm text-muted-foreground">Somente administradores autorizam representantes. Novos cadastros ficam inativos até a vinculação de uma conta autenticada.</p>
      <form onSubmit={createRepresentative} className="grid gap-2 sm:grid-cols-4">
        <Input aria-label="Nome completo" required placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
        <Input aria-label="E-mail" required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input aria-label="Telefone" type="tel" placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button disabled={busy} type="submit">Cadastrar representante</Button>
      </form>
      {error && <p className="text-sm text-destructive">Não foi possível carregar representantes. Verifique se a migração do banco foi aplicada.</p>}
      {isLoading && <p className="text-sm">Carregando representantes...</p>}
      <ul className="space-y-2">
        {representatives.map((rep) => (
          <li key={rep.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div><p className="font-semibold">{rep.full_name}</p><p className="text-xs text-muted-foreground">{rep.email} · {rep.phone || "Sem telefone"}</p>
              <p className="text-xs">{rep.user_id ? "Conta vinculada" : "Aguardando vínculo de conta"}</p></div>
            <div className="flex items-center gap-3"><Button size="sm" variant="outline" onClick={() => editRepresentative(rep)}>Editar</Button><label className="flex items-center gap-2 text-sm">Ativo
              <Switch checked={rep.active} disabled={!rep.user_id && !rep.active} onCheckedChange={() => toggle(rep)} />
            </label></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
