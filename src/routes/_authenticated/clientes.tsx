import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Star, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customersQuery, type Customer } from "@/lib/queries";
import { draftActions } from "@/lib/order-store";
import { CustomerForm } from "@/components/CustomerForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes – NETINHO" },
      { name: "description", content: "Cadastro e seleção de clientes para pedidos." },
      { property: "og:title", content: "Clientes – NETINHO" },
      { property: "og:description", content: "Cadastro e seleção de clientes para pedidos." },
    ],
  }),
  component: Customers,
});

function selectCustomerForOrder(c: Customer) {
  draftActions.update({ customerId: c.id, customerName: c.trade_name || c.company_name,
    buyer: c.buyer ?? "", carrier: c.carrier ?? "" });
}

function Customers() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(customersQuery);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Customer | null | "new">(null);

  const list = useMemo(() => {
    const t = q.toLowerCase().trim();
    return (data ?? []).filter((c) => !t || [c.company_name, c.trade_name, c.cnpj, c.city]
      .some((x) => x?.toLowerCase().includes(t)));
  }, [data, q]);

  async function toggleFav(c: Customer) {
    const { error } = await supabase.from("customers").update({ favorite: !c.favorite }).eq("id", c.id);
    if (error) toast.error("Erro ao atualizar"); else qc.invalidateQueries({ queryKey: ["customers"] });
  }

  function choose(c: Customer) {
    selectCustomerForOrder(c);
    toast.success(`Cliente: ${c.trade_name || c.company_name}`);
    navigate({ to: "/catalogo", search: { modo: "venda" } });
  }

  return (
    <div className="customers-showcase space-y-4 sm:space-y-5">
      <header className="rounded-2xl border border-[#b8cee8] bg-[#edf4ff] px-4 py-5 text-center text-[#102a52] shadow-sm">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">Clientes</h1>
        <p className="mt-2 text-sm">Consulte, cadastre e organize seus clientes.</p>
      </header>
      <section className="space-y-3 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm" aria-label="Pesquisa e cadastro de clientes">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, CNPJ ou cidade" aria-label="Pesquisar clientes" className="h-12 rounded-xl border-[#a7c1e5] bg-[#f7faff] pl-10 text-[#102a52]" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm font-bold text-[#102a52]">{list.length} {list.length === 1 ? "cliente encontrado" : "clientes encontrados"}</p>
        <Button onClick={() => setEditing("new")} className="min-h-11 rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 font-extrabold text-[#102a52] shadow-sm hover:bg-[#dbeafe]"><Plus className="h-4 w-4" /> Novo cliente</Button>
      </div>
      </section>

      {isLoading ? <div className="surface-card h-24 animate-pulse" /> : list.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">
          {data?.length ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado. Toque em “Novo” para cadastrar."}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <li key={c.id} className="surface-card flex min-w-0 items-center gap-2 rounded-2xl border border-[#b8cee8] bg-white p-3 shadow-sm sm:p-4">
              <button onClick={() => toggleFav(c)} aria-label={c.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} className="shrink-0 rounded-lg p-2 hover:bg-[#edf4ff]">
                <Star className={cn("h-5 w-5", c.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
              </button>
              <button onClick={() => choose(c)} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#174e9b]">
                <p className="truncate text-base font-extrabold text-[#102a52]">{c.trade_name || c.company_name}</p>
                <p className="truncate text-xs text-muted-foreground">{[c.cnpj, c.city && `${c.city}/${c.state ?? ""}`].filter(Boolean).join(" · ")}</p>
              </button>
              <button onClick={() => setEditing(c)} aria-label={`Editar ${c.trade_name || c.company_name}`} className="shrink-0 rounded-lg border border-[#a7c1e5] bg-[#eaf2ff] p-2 text-[#174e9b] hover:bg-[#dbeafe]"><Pencil className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === "new" ? "Novo cliente" : "Editar cliente"}</DialogTitle></DialogHeader>
          {editing !== null && (
            <CustomerForm initial={editing === "new" ? null : editing} onSaved={(c) => {
              qc.invalidateQueries({ queryKey: ["customers"] });
              if (editing === "new") { selectCustomerForOrder(c); toast.success("Cliente selecionado para o pedido"); }
              setEditing(null);
            }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
