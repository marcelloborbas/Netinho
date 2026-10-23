import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileDown, FileSpreadsheet, Repeat, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, orderQuery, productsQuery } from "@/lib/queries";
import { BRAND, ORDER_STATUS, brl, termLabel, type PaymentTerm } from "@/lib/brand";
import { downloadOrderPdf } from "@/lib/pdf";
import { downloadOrderXlsx } from "@/lib/xlsx";
import { draftActions } from "@/lib/order-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Pedido – NETINHO" },
      { name: "description", content: "Detalhes do pedido." },
      { property: "og:title", content: "Pedido – NETINHO" },
      { property: "og:description", content: "Detalhes do pedido." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const [sending, setSending] = useState(false);
  const { data, isLoading, error } = useQuery(orderQuery(id));
  const { data: me } = useQuery(meQuery);
  const { data: products } = useQuery(productsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  if (isLoading) return <div className="surface-card h-48 animate-pulse" />;
  if (error || !data) return <p className="surface-card p-5 text-sm">Pedido não encontrado.</p>;
  const { order, items, sellerName } = data;
  const c = order.customer_snapshot as {
    company_name?: string;
    trade_name?: string | null;
    cnpj?: string | null;
    city?: string | null;
    state?: string | null;
  };
  const st = ORDER_STATUS[order.status];

  const summary = [
    `*${order.kind === "orcamento" ? "ORÇAMENTO" : "PEDIDO"} Nº ${order.number}* – ${BRAND.name}`,
    `Cliente: ${c.company_name}${c.cnpj ? ` (CNPJ ${c.cnpj})` : ""}`,
    `Condição: ${termLabel(order.payment_term)}`,
    "",
    ...items.map(
      (i) =>
        `${i.quantity}x ${i.code} – ${brl(Number(i.net_price))} = ${brl(Number(i.line_total))}`,
    ),
    "",
    `TOTAL: ${brl(Number(order.total))}`,
    order.notes ? `Obs: ${order.notes}` : "",
  ].join("\n");

  function repeat() {
    const available = items.map((i) => ({
      item: i,
      product: products?.find((p) => p.id === i.product_id),
    }));
    if (available.some(({ product }) => !product)) {
      toast.error("Há peças indisponíveis neste pedido. Consulte o catálogo antes de repetir.");
      return;
    }
    if (
      draftActions.get().items.length &&
      !window.confirm("Substituir o pedido em andamento por esta cópia?")
    )
      return;
    draftActions.clear();
    for (const { item: i, product: p } of available) {
      if (!p) continue;
      draftActions.addItem({
        productId: p.id,
        code: p.code,
        category: `${p.manufacturer ?? "FCO"} · ${i.category}`,
        application: p.application,
        quantity: i.quantity,
        prices: {
          cash: p.price_cash,
          "30": p.price_30,
          "30_45_60": p.price_30_45_60,
          "30_45_60_75": p.price_30_45_60_75,
        },
      });
    }
    draftActions.update({
      customerId: order.customer_id,
      customerName: c.trade_name || c.company_name || null,
      paymentTerm: order.payment_term as PaymentTerm,
      kind: order.kind as "pedido" | "orcamento",
      delivery: order.delivery ?? "",
      carrier: order.carrier ?? "",
      buyer: order.buyer ?? "",
      notes: order.notes ?? "",
    });
    toast.success("Cópia criada com preços atuais. Revise antes de registrar.");
    navigate({ to: "/pedido" });
  }
  async function sendToPurchasing() {
    if (sending) return;
    setSending(true);
    try {
      await downloadOrderPdf(order, items, sellerName);
      const subject = `${order.kind === "orcamento" ? "Orçamento" : "Pedido"} ${order.number} - Netinho Auto Parts`;
      const body = `Olá, Netinho!\n\nSegue ${order.kind === "orcamento" ? "orçamento" : "pedido"} nº ${order.number}.\nCliente: ${c.company_name || ""}\nTotal: ${brl(Number(order.total))}\nRepresentante: ${sellerName}\n\nAnexe o PDF baixado antes de enviar.`;
      window.location.href = `mailto:${BRAND.orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast.info("PDF baixado. Anexe-o ao e-mail aberto e confirme o envio no seu aplicativo.");
    } catch {
      toast.error("Não foi possível preparar o PDF. Tente novamente antes de enviar.");
    } finally {
      setSending(false);
    }
  }
  async function sharePdf() {
    try {
      const file = await downloadOrderPdf(order, items, sellerName, false);
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ files: [file], title: `Pedido ${order.number} | Netinho` });
      else {
        await downloadOrderPdf(order, items, sellerName);
        toast.info("PDF baixado. Anexe o arquivo no seu aplicativo de e-mail ou WhatsApp.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        toast.error("Não foi possível compartilhar o PDF.");
    }
  }

  async function setStatus(s: string) {
    const { error: e } = await supabase.rpc("update_order_status", {
      order_id: order.id,
      new_status: s,
    });
    if (e) toast.error("Erro ao alterar status");
    else {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    }
  }

  return (
    <div className="space-y-5">
      <Link to="/pedidos" className="text-sm text-muted-foreground">
        ← Pedidos
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold uppercase">
            {order.kind === "orcamento" ? "Orçamento" : "Pedido"} Nº {order.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        {me?.isAdmin ? (
          <Select value={order.status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={cn("rounded px-2.5 py-1 text-xs font-semibold", st?.tone)}>
            {st?.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Button
          className="h-12 bg-gradient-red"
          onClick={() => downloadOrderPdf(order, items, sellerName)}
        >
          <FileDown className="h-4 w-4" /> PDF
        </Button>
        <Button variant="secondary" className="h-12" onClick={() => void downloadOrderXlsx(order, items, sellerName).catch(() => toast.error("Não foi possível gerar o Excel."))}>
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </Button>
        <Button variant="secondary" className="h-12" asChild>
          <a
            href={`https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent(summary)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </Button>
        <Button variant="secondary" className="h-12" onClick={repeat}>
          <Repeat className="h-4 w-4" /> Repetir
        </Button>
      </div>

      <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 className="text-xl font-bold">Revisado e pronto para enviar</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Destino: {BRAND.orderEmail}. O PDF será baixado; anexe-o no e-mail e confirme o envio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={sendToPurchasing} disabled={sending} className="bg-gradient-red">
            {sending ? "Preparando..." : "Preparar e-mail com PDF"}
          </Button>
          <Button variant="outline" onClick={sharePdf}>
            Compartilhar PDF
          </Button>
        </div>
      </div>
      <section className="surface-card grid gap-1 p-4 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Cliente:</span> <b>{c.company_name}</b>
        </p>
        <p>
          <span className="text-muted-foreground">CNPJ:</span> {c.cnpj ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Cidade:</span> {c.city ?? "—"}/{c.state ?? ""}
        </p>
        <p>
          <span className="text-muted-foreground">Condição:</span> {termLabel(order.payment_term)}
        </p>
        <p>
          <span className="text-muted-foreground">Comprador:</span> {order.buyer ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Transportadora:</span> FOB
        </p>
        {order.notes && (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Obs.:</span> {order.notes}
          </p>
        )}
      </section>

      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="surface-card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-display text-lg font-bold">
                {(i as typeof i & { manufacturer?: string }).manufacturer ?? "FCO"} · {i.code}
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{i.application}</p>
              <p className="mt-1 text-xs">
                {i.quantity} × {brl(Number(i.net_price))}
                {Number(i.discount_pct) > 0 && ` (desc. ${Number(i.discount_pct)}%)`}
              </p>
            </div>
            <p className="font-semibold">{brl(Number(i.line_total))}</p>
          </li>
        ))}
      </ul>
      <div className="surface-card flex items-center justify-between p-4">
        <span className="font-semibold uppercase">Total</span>
        <span className="font-display text-3xl font-bold text-primary">
          {brl(Number(order.total))}
        </span>
      </div>
    </div>
  );
}
