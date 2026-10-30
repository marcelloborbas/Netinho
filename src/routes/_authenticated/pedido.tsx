import { customerMinimum } from "@/lib/customer-classes";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Trash2, Minus, Plus, X, PartyPopper, CheckCircle2, MailCheck, ArrowRight, Sparkles, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmOrderEmail } from "@/lib/order-email";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const submissionLock = useRef(false);
  const [sendError, setSendError] = useState("");
  const [sentResult, setSentResult] = useState<"sent" | "failed" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
  function openConfirmation() {
    if (!d.customerId) { toast.error("Selecione o cliente."); return; }
    if (!d.items.length || busy) return;
    buttonSound();
    setReview(true);
    setConfirmOpen(true);
  }
  function closeConfirmation() {
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
    if (submissionLock.current || busy || !d.items.length) return;
    submissionLock.current = true;
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
      // O pedido já foi gravado: não refazer create_order caso o e-mail falhe.
      const orderId = typeof data === "string" ? data : String(data);
      let emailSent = false;
      try {
        await confirmOrderEmail(orderId);
        emailSent = true;
      } catch (mailError) {
        console.error("Falha no envio automático do pedido:", mailError);
        setSendError(mailError instanceof Error ? mailError.message : "O envio não foi confirmado.");
      }
      draftActions.clear();
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["customers"] });
      if (!emailSent) {
        toast.error("Pedido registrado, mas o e-mail não foi confirmado. Consulte o pedido antes de tentar reenviar.", { duration: 9000 });
      }
      setSentResult(emailSent ? "sent" : "failed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar. Seu rascunho foi preservado.",
      );
    } finally {
      setBusy(false);
      submissionLock.current = false;
    }
  }

  // Tela de comemoração aprovada: arte já armazenada no repositório.
  // A área do botão desenhado na arte recebe um link real e acessível.
  if (sentResult === "sent") {
    return (
      <main className="mx-auto w-full max-w-[835px] px-1 pb-6" role="status" aria-label="Pedido enviado com sucesso">
        <div className="relative mx-auto w-full overflow-hidden rounded-2xl shadow-2xl">
          <img
            src="/images/confirma%C3%A7%C3%A3o%20de%20envio.webp"
            alt="Pedido enviado com sucesso! Parabéns pela venda. Acesse Minhas Vendas para acompanhar seus pedidos."
            className="block h-auto w-full"
            draggable={false}
          />
          <Link
            to="/pedidos"
            aria-label="Ir para Minhas Vendas"
            title="Ir para Minhas Vendas"
            className="absolute left-[9%] top-[79%] h-[10%] w-[82%] cursor-pointer rounded-2xl outline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#facc15]"
          >
            <span className="sr-only">Ir para Minhas Vendas</span>
          </Link>
        </div>
      </main>
    );
  }

  if (sentResult) {
    const successful = sentResult === "sent";
    return (
      <main className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border-2 border-[#d4af37] bg-gradient-to-b from-[#102a52] via-[#123c70] to-[#eaf7ff] shadow-2xl" role="status" aria-live="polite">
        {successful && <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 32 }, (_, i) => (
            <span key={i} className="netinho-confetti absolute top-[-12px] block h-3 w-2 rounded-sm"
              style={{ left: `${(i * 37 + 11) % 100}%`, backgroundColor: ["#facc15","#7dd3fc","#ffffff","#fb7185","#4ade80"][i % 5], animationDelay: `${(i % 11) * -0.32}s`, animationDuration: `${2.6 + (i % 6) * .37}s` }} />
          ))}
        </div>}
        <div className="relative z-10 px-5 pb-7 pt-8 text-center sm:px-10 sm:pt-11">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#42d9b4] to-[#159968] shadow-[0_0_36px_#4ade8080]">
            {successful ? <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={2.7}/> : <ClipboardCheck className="h-14 w-14 text-white" strokeWidth={2.7}/>}
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-[#facc15]">
            {successful && <PartyPopper className="h-7 w-7"/>}
            <span className="text-sm font-black uppercase tracking-[.16em]">{successful ? "Venda concluída!" : "Pedido registrado"}</span>
            {successful && <Sparkles className="h-6 w-6"/>}
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            {successful ? "Parabéns pela sua venda!" : "Seu pedido foi registrado"}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg font-semibold leading-relaxed text-[#e7f6ff]">
            {successful ? "Que alegria! Seu pedido foi enviado à Netinho Auto Parts. Obrigado pela dedicação e confiança!" : "O envio do e-mail ainda não foi confirmado. Confira os detalhes antes de tentar novamente."}
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-[#a7e8ff] bg-white/95 p-5 text-left text-[#102a52] shadow-xl">
            <div className="flex items-center gap-3">
              {successful ? <MailCheck className="h-9 w-9 shrink-0 text-[#15803d]"/> : <ClipboardCheck className="h-9 w-9 shrink-0 text-[#b45309]"/>}
              <div>
                <p className="text-lg font-black">{successful ? "Pedido enviado com sucesso!" : "Envio pendente de confirmação"}</p>
                <p className="mt-1 text-sm font-medium">{successful ? "Seu pedido foi encaminhado. Acompanhe o andamento em Minhas Vendas." : "O pedido está registrado, mas não foi possível confirmar a entrega do e-mail."}</p>
              </div>
            </div>
            {!successful && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">{sendError} Consulte Minhas Vendas antes de tentar reenviar.</p>}
          </div>
          <p className="mt-7 text-xl font-black text-[#102a52]">Você fez acontecer! <span aria-hidden="true">🎉</span></p>
          <p className="mt-2 text-base font-semibold text-[#102a52]">Que Deus abençoe seu dia e seus negócios!</p>
          <Button asChild className="mt-6 h-auto min-h-16 w-full max-w-md rounded-2xl border-2 border-white bg-gradient-to-b from-[#8ce5ff] to-[#35b7f2] px-5 py-4 text-lg font-black uppercase tracking-wide text-[#07345d] shadow-[0_8px_0_#1473aa,0_12px_24px_#07345d55] transition-all duration-200 hover:-translate-y-1 hover:from-[#b5f0ff] hover:to-[#5ac9ff] hover:text-[#07345d] active:translate-y-1 active:shadow-[0_3px_0_#1473aa]">
            <Link to="/pedidos" className="flex items-center justify-center gap-3"><Sparkles className="h-6 w-6"/> Ir para Minhas Vendas <ArrowRight className="h-6 w-6"/></Link>
          </Button>
        </div>
        <style>{`@keyframes netinhoConfettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 0; } 12% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(640px) rotate(560deg); opacity: 0; } } .netinho-confetti { animation: netinhoConfettiFall 3.5s linear infinite; } @media (prefers-reduced-motion: reduce) { .netinho-confetti { animation: none; opacity: .65; top: 12%; } }`}</style>
      </main>
    );
  }

  // Enquanto o pedido é registrado e o e-mail é enviado, exibir somente o progresso.
  // Nunca apresentar a confirmação antes da resposta do servidor.
  if (busy) {
    return (
      <main className="flex min-h-[65dvh] items-center justify-center px-4" role="status" aria-live="polite" aria-busy="true">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto flex min-h-28 w-full items-center justify-center gap-4 rounded-3xl border-2 border-white bg-gradient-to-b from-[#78dcff] to-[#168bd1] px-6 py-6 text-xl font-black uppercase tracking-wide text-white shadow-[0_9px_0_#0c5b92,0_18px_32px_#0b396344] sm:min-h-36 sm:text-2xl">
            <span className="inline-block h-9 w-9 shrink-0 animate-spin rounded-full border-4 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true"/>
            <span>Enviando o pedido...</span>
          </div>
          <p className="mt-6 text-base font-semibold text-[#102a52]">Aguarde a confirmação. Não é necessário clicar novamente.</p>
        </div>
      </main>
    );
  }

  if (d.items.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <h1 className="text-2xl font-bold uppercase">Pedido vazio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesquise produtos e adicione ao pedido.
        </p>
        <Button asChild className="mt-6 h-20 min-h-20 w-full max-w-lg rounded-2xl border-2 border-white bg-[#15803d] px-6 text-xl font-black uppercase tracking-wide text-white shadow-[0_7px_0_#14532d,0_12px_22px_#14532d44] transition-all hover:-translate-y-1 hover:bg-[#16a34a] hover:text-white active:translate-y-1 active:shadow-[0_2px_0_#14532d] sm:h-24 sm:min-h-24 sm:text-2xl">
          <Link to="/catalogo" search={{ modo: "venda" }}>FAZER PEDIDO</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {confirmOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-[#06172e]/90 p-2 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="lia-confirm-title">
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-xl shadow-[0_20px_70px_#0009]" style={{ aspectRatio: "941 / 1672", maxHeight: "96dvh", width: "min(100%, 54dvh)" }}>
            <img src="/images/lia-confirmacao-pedido.webp" alt="LIA: Está tudo pronto? Confira os dados do pedido antes de enviar." className="absolute inset-0 h-full w-full object-fill" decoding="async"/>
            <h2 id="lia-confirm-title" className="sr-only">Confirme seu pedido</h2>
            {/* O centro da arte é vazio de propósito: somente o resumo real ocupa este espaço. */}
            <section aria-label="Resumo do pedido" className="absolute left-[13%] right-[13%] top-[44%] bottom-[25%] z-10 flex flex-col justify-center overflow-y-auto rounded-xl border border-[#d4af37] bg-[#f7fbff] px-[4%] py-2 text-[#102a52] shadow-lg">
              <p className="text-center text-sm font-black uppercase tracking-wide">Resumo do pedido</p>
              <div className="mt-2 space-y-1 text-xs font-semibold sm:text-sm">
                <p className="break-words"><strong>Cliente:</strong> {d.customerName ?? "—"}</p>
                <p className="break-words"><strong>Pagamento:</strong> {termLabel(d.paymentTerm)}</p>
                <p><strong>Peças:</strong> {d.items.length}</p>
              </div>
              <div className="mt-3 rounded-lg bg-[#b91c1c] px-2 py-2 text-center text-white">
                <p className="text-[10px] font-bold uppercase tracking-wide">Valor total do pedido</p>
                <p className="text-xl font-black tabular-nums">{brl(t.net)}</p>
              </div>
            </section>
            {/* Áreas invisíveis: os botões da imagem são os únicos visíveis e recebem as ações reais. */}
            <button type="button" onClick={closeConfirmation} aria-label="Revisar Pedido" title="Revisar Pedido" className="absolute bottom-[7%] left-[7%] z-20 h-[9%] w-[41%] cursor-pointer rounded-xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#facc15]"/>
            <button type="button" disabled={busy} onClick={() => { buttonSound(); setConfirmOpen(false); void finalize(); }} aria-label="Enviar Pedido" title="Enviar Pedido" className="absolute bottom-[7%] right-[7%] z-20 h-[9%] w-[41%] cursor-pointer rounded-xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#7dd3fc] disabled:cursor-wait"/>
          </div>
        </div>
      )}
      <div className="relative flex items-center justify-center rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-12 py-5 shadow-md">
        <h1 className="text-center text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
          {review ? "Revisar pedido" : "Pedido"}
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
          <Link to="/novo-cliente" className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-[#166534] px-2.5 text-center text-xs font-bold leading-tight text-white shadow-sm hover:bg-[#14532d] sm:px-3 sm:text-sm">
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

      {review && (
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
