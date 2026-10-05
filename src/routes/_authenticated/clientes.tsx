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
    navigate({ to: "/catalogo" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase">Clientes</h1>
        <Button onClick={() => setEditing("new")} className="bg-gradient-red"><Plus className="h-4 w-4" /> Novo</Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, CNPJ ou cidade" className="h-12 pl-10" />
      </div>

      {isLoading ? <div className="surface-card h-24 animate-pulse" /> : list.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">
          {data?.length ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado. Toque em “Novo” para cadastrar."}</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((c) => (
            <li key={c.id} className="surface-card flex items-center gap-2 p-3">
              <button onClick={() => toggleFav(c)} aria-label="Favorito" className="p-2">
                <Star className={cn("h-5 w-5", c.favorite ? "fill-warning text-warning" : "text-muted-foreground")} />
              </button>
              <button onClick={() => choose(c)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold">{c.trade_name || c.company_name}</p>
                <p className="truncate text-xs text-muted-foreground">{[c.cnpj, c.city && `${c.city}/${c.state ?? ""}`].filter(Boolean).join(" · ")}</p>
              </button>
              <button onClick={() => setEditing(c)} aria-label="Editar" className="p-2 text-muted-foreground"><Pencil className="h-4 w-4" /></button>
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
