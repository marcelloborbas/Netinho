import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customersQuery } from "@/lib/queries";
import { draftActions, draftTotals, lineNet, useDraft } from "@/lib/order-store";
import { PAYMENT_TERMS, brl, termLabel, type PaymentTerm } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pedido")({
  head: () => ({
    meta: [
      { title: "Meu pedido – NETINHO" },
      { name: "description", content: "Conferir e finalizar o pedido em andamento." },
      { property: "og:title", content: "Meu pedido – NETINHO" },
      { property: "og:description", content: "Conferir e finalizar o pedido em andamento." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const d = useDraft();
  const t = draftTotals(d);
  const { data: customers } = useQuery(customersQuery);
  const selectedCustomer = customers?.find((x) => x.id === d.customerId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);

  async function finalize() {
    if (!d.customerId) { toast.error("Selecione o cliente."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_order", {
      payload: {
        customer_id: d.customerId, payment_term: d.paymentTerm, kind: d.kind,
        delivery: d.delivery || null, carrier: d.carrier || null, buyer: d.buyer || null, notes: d.notes || null,
        items: d.items.map((i) => ({ product_id: i.productId, quantity: i.quantity, discount_pct: i.discount })),
      },
    });
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Erro ao enviar pedido."); return; }
    draftActions.clear();
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["customers"] });
    toast.success("Pedido enviado com sucesso!");
    navigate({ to: "/pedidos/$id", params: { id: data } });
  }

  if (d.items.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <h1 className="text-2xl font-bold uppercase">Pedido vazio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pesquise produtos e adicione ao pedido.</p>
        <Button asChild className="mt-5 bg-gradient-red"><Link to="/catalogo">Pesquisar produtos</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase">{review ? "Revisar pedido" : "Fazer pedido"}</h1>
        <button onClick={() => { if (confirm("Descartar o pedido?")) draftActions.clear(); }} className="text-sm text-muted-foreground">Descartar</button>
      </div>

      <section className="surface-card grid gap-4 p-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Cliente *</Label>
          <Select value={d.customerId ?? ""} onValueChange={(id) => {
            const c = customers?.find((x) => x.id === id);
            if (c) draftActions.update({ customerId: c.id, customerName: c.trade_name || c.company_name, buyer: c.buyer ?? d.buyer, carrier: c.carrier ?? d.carrier });
          }}>
            <SelectTrigger className="h-12"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
            <SelectContent>
              {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.favorite ? "★ " : ""}{c.trade_name || c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link to="/clientes" className="text-xs font-semibold text-primary">+ Cadastrar novo cliente</Link>
          {selectedCustomer && (
            <div className="rounded-lg bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
              <b className="text-foreground">{selectedCustomer.trade_name || selectedCustomer.company_name}</b>
              {[selectedCustomer.cnpj && `CNPJ: ${selectedCustomer.cnpj}`,
                selectedCustomer.phone && `Tel.: ${selectedCustomer.phone}`,
                selectedCustomer.email && selectedCustomer.email,
                [selectedCustomer.address, selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(", ")].filter(Boolean).map((item) => <div key={item}>{item}</div>)}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Condição de pagamento</Label>
          <Select value={d.paymentTerm} onValueChange={(v) => draftActions.update({ paymentTerm: v as PaymentTerm })}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_TERMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={d.kind} onValueChange={(v) => draftActions.update({ kind: v as "pedido" | "orcamento" })}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="pedido">Pedido</SelectItem><SelectItem value="orcamento">Orçamento</SelectItem></SelectContent>
          </Select>
        </div>
        <Field label="Entrega" value={d.delivery} onChange={(v) => draftActions.update({ delivery: v })} />
        <Field label="Transportadora" value={d.carrier} onChange={(v) => draftActions.update({ carrier: v })} />
        <Field label="Comprador" value={d.buyer} onChange={(v) => draftActions.update({ buyer: v })} />
      </section>

      <ul className="space-y-2">
        {d.items.map((i) => {
          const unit = i.prices[d.paymentTerm];
          const net = lineNet(i, d.paymentTerm);
          return (
            <li key={i.productId} className="surface-card space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{i.code}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{i.application}</p>
                </div>
                {!review && <button aria-label="Remover" onClick={() => draftActions.removeItem(i.productId)} className="p-1 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {review ? <p className="text-sm">Qtd: <b>{i.quantity}</b> · Desc.: <b>{i.discount}%</b></p> : <>
                  <div className="flex items-center rounded-lg border bg-secondary">
                    <button aria-label="Diminuir" onClick={() => draftActions.updateItem(i.productId, { quantity: Math.max(1, i.quantity - 1) })} className="p-2.5"><Minus className="h-4 w-4" /></button>
                    <input aria-label="Quantidade" inputMode="numeric" value={i.quantity}
                      onChange={(e) => draftActions.updateItem(i.productId, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-12 bg-transparent text-center font-semibold outline-none" />
                    <button aria-label="Aumentar" onClick={() => draftActions.updateItem(i.productId, { quantity: i.quantity + 1 })} className="p-2.5"><Plus className="h-4 w-4" /></button>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">Desc. %
                    <Input inputMode="decimal" value={i.discount} className="h-10 w-16"
                      onChange={(e) => draftActions.updateItem(i.productId, { discount: Math.min(100, Math.max(0, parseFloat(e.target.value.replace(",", ".")) || 0)) })} />
                  </label>
                </>}
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">{brl(unit)}{i.discount > 0 && ` → ${brl(net)}`} un.</p>
                  <p className="font-display text-xl font-bold">{brl(net * i.quantity)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1.5">
        <Label>Observações do pedido</Label>
        <Textarea value={d.notes} onChange={(e) => draftActions.update({ notes: e.target.value })} placeholder="Ex.: entregar pela manhã" />
      </div>

      <section className="surface-card space-y-1 p-4">
        <Row label="Cliente" value={d.customerName ?? "—"} />
        <Row label="Condição" value={termLabel(d.paymentTerm)} />
        <Row label="Itens / unidades" value={`${d.items.length} / ${t.units}`} />
        <Row label="Subtotal" value={brl(t.gross)} />
        {t.discount > 0 && <Row label="Descontos" value={`- ${brl(t.discount)}`} />}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="font-semibold uppercase">Total</span>
          <span className="font-display text-3xl font-bold text-primary">{brl(t.net)}</span>
        </div>
      </section>

      {review ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" className="h-12" onClick={() => setReview(false)}>Voltar e editar</Button>
          <Button className="h-12 bg-gradient-red font-semibold shadow-glow" disabled={busy} onClick={finalize}>
            {busy ? "Enviando..." : "Enviar pedido à distribuidora"}</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" className="h-12 text-base font-semibold"
            onClick={() => { if (!d.customerId) { toast.error("Selecione o cliente."); return; } setReview(true); window.scrollTo(0, 0); }}>
            Revisar pedido</Button>
          <Button className="h-12 bg-gradient-red text-base font-semibold shadow-glow" disabled={busy}
            onClick={finalize}>
            {busy ? "Enviando..." : "Enviar pedido à distribuidora"}</Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} className="h-12" /></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
