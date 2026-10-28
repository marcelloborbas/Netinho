import { customerMinimum } from "@/lib/customer-classes";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Trash2, Minus, Plus, RotateCcw, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customersQuery } from "@/lib/queries";
import { draftActions, draftTotals, lineNet, useDraft } from "@/lib/order-store";
import { BRAND, PAYMENT_TERMS, brl, termLabel, type PaymentTerm } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pedido")({
  head: () => ({
    meta: [
      { title: "Meu pedido | NETINHO" },
      { name: "description", content: "Conferir e finalizar o pedido em andamento." },
      { property: "og:title", content: "Meu pedido | NETINHO" },
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAudioError, setConfirmAudioError] = useState(false);
  const confirmAudio = useRef<HTMLAudioElement | null>(null);
  const [footerOffset, setFooterOffset] = useState(66);
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".mobile-nav");
    if (!footer) return;
    const update = () => setFooterOffset(Math.max(0, window.innerHeight - footer.getBoundingClientRect().top));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => () => { confirmAudio.current?.pause(); }, []);
  function buttonSound() {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(740, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
      oscillator.onended = () => { void ctx.close(); };
    } catch { /* áudio opcional */ }
  }
  function playConfirmation() {
    confirmAudio.current?.pause();
    const audio = new Audio("/audio/lia/lia-confirma%20pedido.mp3");
    confirmAudio.current = audio;
    audio.oncanplay = () => setConfirmAudioError(false);
    audio.onerror = () => setConfirmAudioError(true);
    void audio.play().catch(() => setConfirmAudioError(true));
  }
  function openConfirmation() {
    if (!d.customerId) { toast.error("Selecione o cliente."); return; }
    if (!d.items.length || busy) return;
    buttonSound();
    setReview(true);
    setConfirmOpen(true);
    playConfirmation();
  }
  function closeConfirmation() {
    confirmAudio.current?.pause();
    confirmAudio.current = null;
    setConfirmOpen(false);
    setReview(false);
    buttonSound();
  }


  async function finalize() {
    if (!d.customerId) {
      toast.error("Selecione o cliente.");
      return;
    }
    if (d.kind === "pedido" && t.net < customerMinimum(selectedCustomer?.order_class)) {
      toast.error(
        `Pedido mínimo deste cliente: ${brl(customerMinimum(selectedCustomer?.order_class))}`,
      );
      return;
    }
    if (busy || !d.items.length) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_order", {
        payload: {
          customer_id: d.customerId,
          payment_term: d.paymentTerm,
          kind: d.kind,
          delivery: d.delivery || null,
          carrier: d.carrier || null,
          buyer: d.buyer || null,
          notes: d.notes || null,
          items: d.items.map((i) => ({
            product_id: i.productId,
            quantity: i.quantity,
            discount_pct: i.discount,
          })),
        },
      });
      if (error || !data) throw error ?? new Error("Erro ao registrar pedido.");
      draftActions.clear();
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Pedido registrado! Gere o PDF ou envie ao setor de compras.");
      navigate({ to: "/pedidos/$id", params: { id: data } });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar. Seu rascunho foi preservado.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (d.items.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <h1 className="text-2xl font-bold uppercase">Pedido vazio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesquise produtos e adicione ao pedido.
        </p>
        <Button asChild className="mt-5 bg-gradient-red">
          <Link to="/vendas" search={{ modo: "venda", q: "", promo: "" }}>Selecionar cliente e peças</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {confirmOpen && (
        <div className="fixed inset-0 z-[6000] flex items-start justify-center bg-[#071c37]/75 px-4 pt-[8vh]" role="dialog" aria-modal="true" aria-labelledby="lia-confirm-title">
          <div className="w-full max-w-md rounded-2xl border-2 border-[#d4af37] bg-white p-4 pb-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 id="lia-confirm-title" className="text-xl font-black text-[#102a52]">CONFIRME SEU PEDIDO</h2>
              <button type="button" aria-label="Fechar confirmação" onClick={closeConfirmation} className="rounded-lg p-2 text-[#102a52] hover:bg-slate-100"><X size={22} /></button>
            </div>
            <p className="mt-3 whitespace-pre-line text-base font-semibold leading-7 text-[#102a52]">{"Vamos lá!\\n\\nAntes de enviar, confira os dados do pedido!\\n\\nEstá tudo certinho?\\n\\nEntão, é só clicar em Enviar Pedido!".replaceAll("\\n", "\n")}</p>
            <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-[#102a52]">
              <p><strong>Cliente:</strong> {d.customerName ?? "—"}</p>
              <p><strong>Pagamento:</strong> {termLabel(d.paymentTerm)}</p>
              <p><strong>Peças:</strong> {d.items.length} · <strong>Total:</strong> {brl(t.net)}</p>
            </div>
            <button type="button" onClick={() => { buttonSound(); playConfirmation(); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#102a52] px-4 text-sm font-bold text-[#102a52] transition-transform active:scale-95"><RotateCcw size={17} /> Rever ajuda <Volume2 size={17} /></button>
            {confirmAudioError && <p className="mt-2 text-xs text-amber-700">A gravação da LIA ainda não está disponível neste endereço.</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button type="button" className="h-12 bg-[#ea580c] text-base font-bold text-white transition-transform active:scale-95 hover:bg-[#c2410c]" onClick={closeConfirmation}>Corrigir pedido</Button>
              <Button type="button" className="h-12 bg-[#1687d9] text-base font-bold text-white transition-transform active:scale-95 hover:bg-[#0c70bc]" disabled={busy} onClick={() => { buttonSound(); confirmAudio.current?.pause(); setConfirmOpen(false); void finalize(); }}>{busy ? "Enviando..." : "Enviar Pedido"}</Button>
            </div>
          </div>
          <img src="/images/lia-confirma%20pedido.webp" alt="LIA confirma o envio do pedido" className="pointer-events-none fixed left-1/2 z-[6001] w-[min(76vw,310px)] -translate-x-1/2 object-contain object-bottom" style={{ bottom: footerOffset }} />
        </div>
      )}
      <div className="relative flex items-center justify-center rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-12 py-5 shadow-md">
        <h1 className="text-center text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
          {review ? "Revisar pedido" : "Fazer pedido"}
        </h1>
        <button
          onClick={() => {
            if (confirm("Descartar o pedido?")) draftActions.clear();
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          aria-label="Descartar pedido"
          title="Descartar pedido"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <section className="surface-card grid gap-4 p-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-lg font-black uppercase tracking-wide text-[#102a52] sm:text-xl">CLIENTE *</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-bold text-[#102a52]">Selecione o cliente</Label>
          {selectedCustomer?.order_class && (
            <p className="text-sm text-amber-400">
              Classe {selectedCustomer.order_class} · Pedido mínimo{" "}
              {brl(customerMinimum(selectedCustomer.order_class))}
              {t.net < customerMinimum(selectedCustomer.order_class)
                ? ` · Faltam ${brl(customerMinimum(selectedCustomer.order_class) - t.net)}`
                : " · Mínimo atingido"}
            </p>
          )}
          <div className="flex items-center gap-2">
          <Select
            value={d.customerId ?? ""}
            onValueChange={(id) => {
              const c = customers?.find((x) => x.id === id);
              if (c)
                draftActions.update({
                  customerId: c.id,
                  customerName: c.trade_name || c.company_name,
                  buyer: c.buyer ?? d.buyer,
                  carrier: c.carrier ?? d.carrier,
                });
            }}
          >
            <SelectTrigger className="h-12 min-w-0 flex-1">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.favorite ? "★ " : ""}
                  {c.trade_name || c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to="/clientes" className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-[#166534] px-2.5 text-center text-xs font-bold leading-tight text-white shadow-sm hover:bg-[#14532d] sm:px-3 sm:text-sm">
            + Novo cliente
          </Link>
          </div>
            </div>
            <div className="space-y-1.5"><Field label="Comprador" value={d.buyer} onChange={(v) => draftActions.update({ buyer: v })} /></div></div>
          {selectedCustomer && (
            <div className="rounded-lg bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
              <b className="text-foreground">
                {selectedCustomer.trade_name || selectedCustomer.company_name}
              </b>
              {selectedCustomer.cnpj && <div>CNPJ: {selectedCustomer.cnpj}</div>}
              {selectedCustomer.phone && <div>Tel.: {selectedCustomer.phone}</div>}
              {selectedCustomer.email && <div>{selectedCustomer.email}</div>}
              {(selectedCustomer.address || selectedCustomer.city || selectedCustomer.state) && (
                <div>
                  {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="space-y-1.5">
          <Label className="text-base font-extrabold text-[#102a52] sm:text-lg">Condição de pagamento</Label>
          <Select
            value={d.paymentTerm}
            onValueChange={(v) => draftActions.update({ paymentTerm: v as PaymentTerm })}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </section>

      <div className="grid grid-cols-2 gap-2 sm:gap-3" aria-label="Ações do pedido">
        <Button type="button" className="h-auto min-h-12 whitespace-normal border-0 bg-[#ea580c] px-2 py-2 text-center text-sm font-bold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 hover:bg-[#c2410c] sm:text-base" onClick={() => { buttonSound(); setReview(false); document.getElementById("pedido-itens")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
          Editar pedido
        </Button>
        <Button asChild className="h-auto min-h-12 whitespace-normal border-0 bg-[#166534] px-2 py-2 text-center text-sm font-bold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 hover:bg-[#14532d] sm:text-base">
          <Link to="/catalogo" search={{ modo: "venda" }} onClick={buttonSound}>Continuar comprando</Link>
        </Button>
        <Button type="button" className="col-span-2 h-12 whitespace-normal bg-[#1687d9] px-2 py-2 text-center text-base font-bold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-95 hover:bg-[#0c70bc] sm:text-lg" disabled={busy || !d.items.length} onClick={openConfirmation}>
          Enviar PEDIDO
        </Button>
      </div>

      <ul id="pedido-itens" className="space-y-2">
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
                {!review && (
                  <button
                    aria-label="Remover"
                    onClick={() => draftActions.removeItem(i.productId)}
                    className="p-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {review ? (
                  <p className="text-sm">
                    Qtd: <b>{i.quantity}</b> · Desc.: <b>{i.discount}%</b>
                  </p>
                ) : (
                  <>
                    <div className="flex items-center rounded-lg border bg-secondary">
                      <button
                        aria-label="Diminuir"
                        onClick={() =>
                          draftActions.updateItem(i.productId, {
                            quantity: Math.max(1, i.quantity - 1),
                          })
                        }
                        className="p-2.5"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        aria-label="Quantidade"
                        inputMode="numeric"
                        value={i.quantity}
                        onChange={(e) =>
                          draftActions.updateItem(i.productId, {
                            quantity: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-12 bg-transparent text-center font-semibold outline-none"
                      />
                      <button
                        aria-label="Aumentar"
                        onClick={() =>
                          draftActions.updateItem(i.productId, { quantity: i.quantity + 1 })
                        }
                        className="p-2.5"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      Desc. %
                      <Input
                        inputMode="decimal"
                        value={i.discount}
                        className="h-10 w-16"
                        onChange={(e) =>
                          draftActions.updateItem(i.productId, {
                            discount: Math.min(
                              100,
                              Math.max(0, parseFloat(e.target.value.replace(",", ".")) || 0),
                            ),
                          })
                        }
                      />
                    </label>
                  </>
                )}
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">
                    {brl(unit)}
                    {i.discount > 0 && ` → ${brl(net)}`} un.
                  </p>
                  <p className="font-display text-xl font-bold">{brl(net * i.quantity)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1.5">
        <Label className="text-base font-extrabold text-[#102a52] sm:text-lg">Observações do pedido</Label>
        <Textarea
          value={d.notes}
          onChange={(e) => draftActions.update({ notes: e.target.value })}
          placeholder="Ex.: entregar pela manhã"
        />
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
        <>
          <p className="rounded-xl border p-4 text-sm">
            Confira os dados abaixo antes de registrar. Na próxima tela você poderá preparar o envio
            para <strong>{BRAND.orderEmail}</strong>, com o PDF do pedido.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-12" onClick={() => setReview(false)}>
              Voltar e editar
            </Button>
            <Button
              className="h-12 bg-gradient-red font-semibold shadow-glow"
              disabled={busy}
              onClick={openConfirmation}
            >
              {busy ? "Enviando..." : "Registrar pedido"}
            </Button>
          </div>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            className="h-12 text-base font-semibold"
            onClick={() => {
              if (!d.customerId) {
                toast.error("Selecione o cliente.");
                return;
              }
              openConfirmation();
            }}
          >
            Revisar pedido
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/catalogo" search={{ modo: "venda" }}>
              Continuar comprando
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-base font-extrabold text-[#102a52] sm:text-lg">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-12" />
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
