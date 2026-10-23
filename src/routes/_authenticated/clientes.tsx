import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customersQuery, type Customer } from "@/lib/queries";
import { draftActions } from "@/lib/order-store";
import { accessQuery } from "@/lib/access";
import { CustomerForm } from "@/components/CustomerForm";
import { downloadCustomerXlsx } from "@/lib/customer-xlsx";
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
  const { data: access } = useQuery(accessQuery);
  const isAdmin = access?.level === 1;
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { data, isLoading } = useQuery(customersQuery);
  const [editing, setEditing] = useState<Customer | null | "new">(null);

  const list = data ?? [];

  async function toggleFav(c: Customer) {
    const { error } = await supabase.from("customers").update({ favorite: !c.favorite }).eq("id", c.id);
    if (error) toast.error("Erro ao atualizar"); else qc.invalidateQueries({ queryKey: ["customers"] });
  }

  async function deleteCustomer() {
    if (!isAdmin || !deleting || deletingBusy) return;
    setDeletingBusy(true);
    const { data: permission, error: permissionError } = await supabase.rpc("access_context");
    const permissionRow = Array.isArray(permission) ? permission[0] : permission;
    const permissionLevel = (permissionRow as { level?: number } | null | undefined)?.level;
    if (permissionError || permissionLevel !== 1) {
      toast.error("Somente o administrador pode excluir clientes.");
      setDeletingBusy(false);
      return;
    }
    const { error } = await supabase.from("customers").delete().eq("id", deleting.id);
    setDeletingBusy(false);
    if (error) {
      toast.error("Não foi possível excluir. Verifique as permissões ou os pedidos vinculados ao cliente.");
      return;
    }
    toast.success("Cliente excluído.");
    setDeleting(null);
    await qc.invalidateQueries({ queryKey: ["customers"] });
  }

  return (
    <div className="customers-showcase space-y-4 sm:space-y-5">
      <header className="rounded-2xl border border-[#b8cee8] bg-[#edf4ff] px-4 py-5 text-center text-[#102a52] shadow-sm">
        <h1 className="text-[28px] font-extrabold leading-tight sm:text-[34px]">Clientes</h1>
        <p className="mt-2 text-sm">Consulte, cadastre e organize seus clientes.</p>
      </header>
      <section className="space-y-3 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm" aria-label="Cadastro e lista de clientes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm font-bold text-[#102a52]">{list.length} {list.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}</p>
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
              <button onClick={() => setEditing(c)} className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#174e9b]">
                <p className="truncate text-base font-extrabold text-[#102a52]">{c.trade_name || c.company_name}</p>
                <p className="truncate text-xs text-muted-foreground">{[c.cnpj, c.city && `${c.city}/${c.state ?? ""}`].filter(Boolean).join(" · ")}</p>
              </button>
              <button type="button" onClick={() => void downloadCustomerXlsx(c).catch(() => toast.error("Não foi possível gerar a ficha Excel."))} title="Baixar ficha cadastral Excel" aria-label={`Baixar ficha cadastral de ${c.trade_name || c.company_name}`} className="shrink-0 rounded-lg border border-[#a7c1e5] bg-[#eaf2ff] p-2 text-[#174e9b] hover:border-[#174e9b] hover:bg-[#dbeafe] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#174e9b]"><FileSpreadsheet className="h-4 w-4" /></button>
              <button onClick={() => setEditing(c)} aria-label={`Editar ${c.trade_name || c.company_name}`} className="shrink-0 rounded-lg border border-[#a7c1e5] bg-[#eaf2ff] p-2 text-[#174e9b] hover:bg-[#dbeafe]"><Pencil className="h-4 w-4" /></button>
              {isAdmin && <span className="shrink-0 rounded-lg bg-green-100 px-2 py-1 text-xs font-extrabold text-green-800" title="Cadastro disponível">Ativo</span>}
              {isAdmin && <button onClick={() => setDeleting(c)} aria-label={`Excluir ${c.trade_name || c.company_name}`} className="shrink-0 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open && !deletingBusy) setDeleting(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Excluir cliente?</DialogTitle></DialogHeader>
          <p className="text-sm">Você está prestes a excluir permanentemente <strong>{deleting?.trade_name || deleting?.company_name}</strong>. Essa ação não poderá ser desfeita.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={deletingBusy} onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button type="button" disabled={!isAdmin || deletingBusy} onClick={deleteCustomer} className="bg-red-700 text-white hover:bg-red-800">{deletingBusy ? "Excluindo..." : "Confirmar exclusão"}</Button>
          </div>
        </DialogContent>
      </Dialog>

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
