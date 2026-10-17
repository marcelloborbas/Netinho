import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
type Commission = {
  order_id: string;
  number: number;
  created_at: string;
  status: string;
  customer_name: string;
  manufacturer: string;
  sold_total: number;
  rate: number | null;
  commission: number | null;
  paid_at: string | null;
};
const rates = [0.5, 1, 3, 3.5, 5, 6];
export function SupplierCommissions() {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["supplier-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_supplier_commissions");
      if (error) throw error;
      return data as unknown as Commission[];
    },
  });
  const [supplier, setSupplier] = useState("all");
  const rows = data.filter((r) => supplier === "all" || r.manufacturer === supplier);
  const payable = rows
    .filter((r) => r.status === "invoiced" && !r.paid_at)
    .reduce((s, r) => s + Number(r.commission ?? 0), 0);
  return (
    <section className="surface-card space-y-4 p-5">
      <h2 className="text-xl font-bold">Pedidos por fornecedor e comissões</h2>
      <p className="text-sm text-muted-foreground">
        Comissão sobre o total líquido vendido de cada fornecedor. O repasse fica disponível após o
        faturamento. Defina uma taxa para cada pedido e fornecedor.
      </p>
      <label className="flex items-center gap-3 text-sm">
        Fornecedor
        <select
          className="rounded-lg border bg-secondary p-2"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        >
          <option value="all">FCO e HD</option>
          <option>FCO</option>
          <option>HD</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <p>
          Vendido:{" "}
          <strong>
            {brl(
              rows
                .filter((r) => r.status !== "cancelled")
                .reduce((s, r) => s + Number(r.sold_total), 0),
            )}
          </strong>
        </p>
        <p>
          A repassar: <strong className="text-amber-400">{brl(payable)}</strong>
        </p>
        <p>
          Repassado:{" "}
          <strong>
            {brl(rows.filter((r) => r.paid_at).reduce((s, r) => s + Number(r.commission ?? 0), 0))}
          </strong>
        </p>
      </div>
      {rows.some((r) => r.rate === null) && (
        <p className="text-sm text-amber-400">
          Há pedidos sem taxa definida. Eles não entram nos totais de comissão.
        </p>
      )}
      {isLoading && <p>Carregando comissões...</p>}
      {error && (
        <p role="alert">
          Não foi possível carregar as comissões. Verifique a migração do banco e tente novamente.
        </p>
      )}
      <div className="space-y-3">
        {rows.map((r) => (
          <CommissionRow key={`${r.order_id}-${r.manufacturer}`} row={r} />
        ))}
      </div>
      {!isLoading && !error && !rows.length && (
        <p className="text-sm">Nenhum pedido para este fornecedor.</p>
      )}
    </section>
  );
}
function CommissionRow({ row: r }: { row: Commission }) {
  const [rate, setRate] = useState(r.rate?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  async function save(paid: boolean) {
    if (!rate) {
      toast.error("Selecione a taxa de comissão.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("save_supplier_commission", {
        p_order_id: r.order_id,
        p_manufacturer: r.manufacturer,
        p_rate: Number(rate),
        p_paid: paid,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["supplier-commissions"] });
      toast.success("Comissão atualizada");
    } catch {
      toast.error("Não foi possível salvar a comissão. Confira a taxa e o faturamento do pedido.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">
            Pedido #{r.number} · {r.manufacturer}
          </h3>
          <p className="text-sm">
            {r.customer_name} · {brl(Number(r.sold_total))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.paid_at
              ? `Repassado em ${new Date(r.paid_at).toLocaleDateString("pt-BR")}`
              : r.status === "cancelled"
                ? "Cancelado"
                : r.status === "invoiced"
                  ? "Faturado · a repassar"
                  : "Aguardando faturamento"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            Taxa{" "}
            <select
              aria-label={`Taxa pedido ${r.number} ${r.manufacturer}`}
              className="rounded border bg-secondary p-2"
              value={rate}
              disabled={!!r.paid_at || busy}
              onChange={(e) => setRate(e.target.value)}
            >
              <option value="">Definir</option>
              {rates.map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString("pt-BR")}%
                </option>
              ))}
            </select>
          </label>
          <strong>
            {rate ? brl(Math.round(Number(r.sold_total) * Number(rate)) / 100) : "Taxa pendente"}
          </strong>
          <Button
            variant="outline"
            disabled={busy || !rate || !!r.paid_at}
            onClick={() => save(false)}
          >
            Salvar taxa
          </Button>
          <Button
            disabled={busy || !rate || (!r.paid_at && r.status !== "invoiced")}
            onClick={() => save(!r.paid_at)}
          >
            {r.paid_at ? "Estornar repasse" : "Registrar repasse"}
          </Button>
        </div>
      </div>
    </article>
  );
}
