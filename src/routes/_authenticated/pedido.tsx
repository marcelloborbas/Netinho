import { customerMinimum } from "@/lib/customer-classes";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { Trash2, Minus, Plus, X, ShoppingCart, PartyPopper, CheckCircle2, MailCheck, ArrowRight, Sparkles, ClipboardCheck, Volume2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmOrderEmail } from "@/lib/order-email";
import { PublicFooter } from "@/components/PublicFooter";
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
  const router = useRouter();
  useEffect(() => {
    if (d.items.length !== 0) return;
    // Antecipar o carregamento da rota do catálogo enquanto a arte é exibida.
    void router.preloadRoute({ to: "/catalogo", search: { modo: "venda" } }).catch(() => {});
  }, [router, d.items.length]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const submissionLock = useRef(false);
  const [sendError, setSendError] = useState("");
  const [sentResult, setSentResult] = useState<"sent" | "failed" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmHelpOpen, setConfirmHelpOpen] = useState(false);
  // À vista é uma condição válida e já vem selecionada no rascunho.
  const paymentChosen = PAYMENT_TERMS.some((term) => term.value === d.paymentTerm);
  const [actionChosen, setActionChosen] = useState(false);
  const [confirmSpeaking, setConfirmSpeaking] = useState(false);
  const confirmAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { confirmAudioRef.current?.pause(); confirmAudioRef.current = null; }, []);
  function stopConfirmAudio() {
    if (confirmAudioRef.current) {
      confirmAudioRef.current.pause();
      confirmAudioRef.current.onended = null;
      confirmAudioRef.current = null;
    }
    setConfirmSpeaking(false);
  }
  function playConfirmHelp() {
    stopConfirmAudio();
    const audio = new Audio("/audio/lia/lia-confirma%20pedido.mp3?v=20261104-1");
    audio.loop = false;
    audio.autoplay = false;
    confirmAudioRef.current = audio;
    audio.onended = () => {
      if (confirmAudioRef.current === audio) {
        confirmAudioRef.current = null;
        setConfirmSpeaking(false);
      }
    };
    audio.onerror = () => setConfirmSpeaking(false);
    setConfirmSpeaking(true);
    void audio.play().catch(() => setConfirmSpeaking(false));
  }
  const sentSpeechStarted = useRef(false);
  useEffect(() => {
    if (sentResult !== "sent") { sentSpeechStarted.current = false; return; }
    if (sentSpeechStarted.current) return;
    sentSpeechStarted.current = true;
    // Ainda não há MP3 específico de "pedido enviado" no repositório.
    // Usar locução nativa quando disponível, sem repetir ou bloquear a interface.
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance("Seu pedido já foi enviado para a Netinho! Uma cópia também foi encaminhada para o seu e-mail. Obrigada pela confiança e boas vendas!");
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [sentResult]);
  const pulseStep = !d.customerId ? "customer" : !paymentChosen ? "payment" : "actions";
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
    stopConfirmAudio();
    setConfirmHelpOpen(false);
    setConfirmOpen(true);
    // A locução é iniciada uma única vez após a ação do usuário.
    playConfirmHelp();
  }
  function closeConfirmation() {
    stopConfirmAudio();
    setConfirmHelpOpen(false);
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
    // Mostra a tela de progresso antes de iniciar chamadas de rede.
    flushSync(() => {
      setConfirmOpen(false);
      setBusy(true);
    });
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
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex flex-col bg-[#0862bd]">
        <main className="min-h-0 flex-1 overflow-hidden" role="status" aria-label="Pedido enviado com sucesso">
          <div className="relative mx-auto h-full w-full max-w-[600px]">
            <img src="/images/lia-confirmacao-pedido-final.webp?v=67549b3a" alt="Pedido enviado com sucesso! Parabéns pela venda." className="block h-full w-full object-fill" draggable={false} />
            <Link to="/pedidos" className="absolute bottom-[12%] left-[3%] z-20 h-[15%] w-[94%] touch-manipulation rounded-2xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-400" aria-label="Ir para Minhas Vendas" title="Ir para Minhas Vendas"><span className="sr-only">Ir para Minhas Vendas</span></Link>
          </div>
        </main>
        <div className="relative z-[100000] h-[76px] shrink-0"><PublicFooter /></div>
      </div>,
      document.body
    );
  }

  if (sentResult) {
    // "sent" já retornou na tela de comemoração acima; este bloco cobre apenas a falha.
    const successful = false;
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
      <main className="flex min-h-[75dvh] items-center justify-center bg-gradient-to-b from-[#102a52] via-[#145fa5] to-[#eaf6ff] px-4" role="status" aria-live="polite" aria-busy="true">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto flex min-h-28 w-full items-center justify-center gap-4 rounded-3xl border-2 border-[#d4af37] bg-gradient-to-b from-[#3ab5f5] to-[#0755a0] px-6 py-6 text-xl font-black uppercase tracking-wide text-white shadow-[0_9px_0_#0c5b92,0_18px_32px_#0b396344] sm:min-h-36 sm:text-2xl">
            <span className="inline-block h-9 w-9 shrink-0 animate-spin rounded-full border-4 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true"/>
            <span>Enviando o pedido...</span>
          </div>
          <p className="mt-6 text-base font-semibold text-white">Aguarde a confirmação. Não é necessário clicar novamente.</p>
        </div>
      </main>
    );
  }

  if (d.items.length === 0) {
    return (
      <main className="relative mx-auto min-h-[100dvh] w-full max-w-[540px] overflow-hidden bg-[#d9f1ff]" aria-label="Fazer pedido">
        <div className="relative h-[100dvh] w-full overflow-hidden">
          <img
            src="/images/lia-fazer-pedido.webp?v=20261102"
            alt="LIA convida você a pesquisar produtos e adicioná-los ao pedido. É rápido, fácil e seguro!"
            className="block h-full w-full object-fill"
            decoding="async"
          />
          <Link
            to="/catalogo"
            search={{ modo: "venda" }}
            aria-label="Fazer seu pedido: abrir catálogo de peças"
            title="Fazer seu pedido"
            className="absolute bottom-[18%] left-[2%] z-50 block h-[16%] w-[96%] touch-manipulation cursor-pointer rounded-2xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#facc15]"
          >
            <span className="sr-only">Faça seu pedido</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4 pb-5">
      <style>{`@keyframes netinhoGuidePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,.22), 0 0 10px rgba(220,38,38,.2); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,.12), 0 0 24px rgba(239,68,68,.7); } } .netinho-guided-pulse { animation: netinhoGuidePulse 1.5s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .netinho-guided-pulse { animation: none; } }`}</style>
      {confirmOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col bg-[#0862bd]" role="dialog" aria-modal="true" aria-labelledby="lia-confirm-title">
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="relative mx-auto h-full w-full max-w-[600px]">
              <div className="relative h-full w-full">
                <picture className="block h-full w-full">
                  <source media="(min-width: 640px)" srcSet="/images/lia-confirmacao-pedido-web.webp?v=875902f2"/>
                  <img src="/images/lia-confirmacao-pedido-mobile.webp?v=20261102" alt="Confira os dados do pedido antes de enviar." className="block h-full w-full object-fill" decoding="async"/>
                </picture>
                <h2 id="lia-confirm-title" className="sr-only">Confirme seu pedido</h2>
                {/* Os dados ficam dentro da área livre da arte, e não abaixo da imagem. */}
                <section aria-label="Dados do pedido" className="absolute left-[13%] right-[13%] top-[42%] bottom-[22%] z-10 flex flex-col justify-center overflow-y-auto px-[3%] py-1 text-[#102a52]">
                  <div className="space-y-1 text-[clamp(12px,4.3vw,24px)] font-semibold leading-tight">
                    <p className="break-words"><strong>Cliente:</strong> {d.customerName ?? selectedCustomer?.trade_name ?? selectedCustomer?.company_name ?? "—"}</p>
                    <p className="break-words"><strong>Pagamento:</strong> {termLabel(d.paymentTerm)}</p>
                    <p><strong>Peças:</strong> {d.items.length}</p>
                  </div>
                  <div className="mt-2 rounded-lg bg-[#b91c1c] px-2 py-2 text-center text-white">
                    <p className="text-[clamp(11px,3.3vw,18px)] font-bold uppercase leading-tight">Valor total do pedido</p>
                    <p className="break-all text-[clamp(17px,6vw,36px)] font-black tabular-nums leading-tight">{brl(t.net)}</p>
                  </div>
                </section>
                {/* Áreas clicáveis transparentes sobre os botões desenhados na própria arte. */}
                <button type="button" onClick={closeConfirmation} aria-label="Revisar Pedido" title="Revisar Pedido" className="absolute bottom-[0%] left-[2%] z-20 h-[15%] w-[47%] cursor-pointer touch-manipulation rounded-xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-400">
                  <span className="sr-only">Revisar Pedido</span>
                </button>
                <button type="button" disabled={busy} onClick={() => { buttonSound(); stopConfirmAudio(); setConfirmHelpOpen(false); void finalize(); }} aria-label="Enviar Pedido" title="Enviar Pedido" className="absolute bottom-[0%] right-[2%] z-20 h-[15%] w-[47%] cursor-pointer touch-manipulation rounded-xl bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-400 disabled:cursor-not-allowed">
                  <span className="sr-only">Enviar Pedido</span>
                </button>
              </div>

            </div>
          </div>
          <div className="relative z-[100000] h-[76px] shrink-0"><PublicFooter /></div>
        </div>,
        document.body
      )}
      <div className="flex items-center justify-center gap-4 rounded-[22px] border border-[#e4b941] bg-gradient-to-r from-[#091b36] via-[#143c70] to-[#0b2447] px-4 py-4 shadow-[0_8px_22px_rgba(9,27,54,.22)]">
        <h1 className="text-center text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
          {review ? "Revisar pedido" : "Pedido"}
        </h1>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Deseja excluir este pedido em aberto? Esta ação não pode ser desfeita.")) {
              draftActions.clear();
              setReview(false);
            }
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-red-600 text-white shadow-lg transition hover:bg-red-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-300"
          aria-label="Excluir pedido em aberto"
          title="Excluir pedido em aberto"
        >
          <Trash2 className="h-6 w-6" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 px-1" aria-label="Etapas do pedido">
        {[
          { label: "Cliente", done: !!d.customerId, active: pulseStep === "customer" },
          { label: "Pagamento", done: paymentChosen, active: pulseStep === "payment" },
          { label: "Finalizar", done: false, active: pulseStep === "actions" },
        ].map((step, index) => (
          <div key={step.label} className={`flex items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-[11px] font-extrabold sm:text-sm ${step.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : step.active ? "netinho-guided-pulse border-red-500 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-500"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${step.done ? "bg-emerald-700 text-white" : step.active ? "bg-red-600 text-white" : "bg-slate-200 text-slate-600"}`}>{step.done ? "✓" : index + 1}</span>
            {step.label}
          </div>
        ))}
      </div>
      <section className={`surface-card grid gap-4 rounded-[22px] border-2 p-4 shadow-[0_8px_24px_rgba(16,42,82,.09)] sm:grid-cols-2 ${pulseStep === "customer" ? "netinho-guided-pulse border-red-500 bg-red-50" : d.customerId ? "border-emerald-400 bg-emerald-50" : "border-[#dce5f0] bg-white"}`}>
        <div className="space-y-1.5 sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a08]">Etapa 01 · Identificação</p>
              <Label className="text-lg font-black uppercase tracking-wide text-[#102a52] sm:text-xl">CLIENTE *</Label>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${d.customerId ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{d.customerId ? "✓ Selecionado" : "Pendente"}</span>
          </div>
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
            <SelectTrigger className="h-12 min-w-0 flex-1 rounded-xl border-[#b7c8de] bg-white text-sm font-semibold text-[#102a52] shadow-sm focus:ring-2 focus:ring-amber-400">
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
          <Link to="/novo-cliente" className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#21834d] to-[#125b35] px-3 text-center text-xs font-extrabold leading-tight text-white shadow-md hover:from-[#166534] hover:to-[#14532d] sm:px-4 sm:text-sm">
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

      <section className={`surface-card rounded-[22px] border-2 p-4 shadow-[0_8px_24px_rgba(16,42,82,.09)] ${pulseStep === "payment" ? "netinho-guided-pulse border-red-500 bg-red-50" : paymentChosen ? "border-emerald-400 bg-emerald-50" : "border-[#dce5f0] bg-white"}`}>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a08]">Etapa 02 · Valores</p>
              <Label className="text-base font-extrabold text-[#102a52] sm:text-lg">Condição de pagamento</Label>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${paymentChosen ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{paymentChosen ? "✓ Confirmada" : "Escolha uma opção"}</span>
          </div>
          <Select
            value={d.paymentTerm}
            onValueChange={(v) => { draftActions.update({ paymentTerm: v as PaymentTerm }); }}
          >
            <SelectTrigger className="mt-2 h-12 rounded-xl border-[#b7c8de] bg-white font-semibold text-[#102a52] shadow-sm focus:ring-2 focus:ring-amber-400">
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

      <section className={`rounded-[22px] border-2 p-3 shadow-sm sm:p-4 ${pulseStep === "actions" ? "netinho-guided-pulse border-red-500 bg-red-50" : "border-[#dce5f0] bg-white"}`} aria-label="Etapa 3: ações do pedido">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#a77a08]">Etapa 03 · Finalização</p>
            <p className="text-sm font-extrabold text-[#102a52] sm:text-base">Escolha como continuar</p>
          </div>
          <span className="shrink-0 rounded-lg bg-[#e9f1fc] px-2.5 py-1 text-xs font-bold text-[#153d6d]">{d.items.length} {d.items.length === 1 ? "peça" : "peças"}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Button type="button" className="flex aspect-square h-auto min-w-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#ea580c] p-2 text-center text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-[#c2410c] active:scale-95" onClick={() => { setActionChosen(true); buttonSound(); setReview(false); document.getElementById("pedido-itens")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            <Pencil className="h-6 w-6 shrink-0 sm:h-8 sm:w-8" aria-hidden="true" />
            <span className="whitespace-normal text-[11px] font-extrabold leading-tight sm:text-sm">Editar pedido</span>
          </Button>
          <Button asChild className="flex aspect-square h-auto min-w-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#166534] p-2 text-center text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-[#14532d] active:scale-95">
            <Link to="/catalogo" search={{ modo: "venda" }} onClick={() => { setActionChosen(true); buttonSound(); }}>
              <ShoppingCart className="h-6 w-6 shrink-0 sm:h-8 sm:w-8" aria-hidden="true" />
              <span className="whitespace-normal text-[11px] font-extrabold leading-tight sm:text-sm">Continuar comprando</span>
            </Link>
          </Button>
          <Button type="button" className="flex aspect-square h-auto min-w-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#0767b6] p-2 text-center text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-[#0c70bc] active:scale-95 disabled:opacity-50" disabled={busy || !d.items.length} onClick={() => { setActionChosen(true); openConfirmation(); }}>
            <ClipboardCheck className="h-6 w-6 shrink-0 sm:h-8 sm:w-8" aria-hidden="true" />
            <span className="whitespace-normal text-[11px] font-extrabold leading-tight sm:text-sm">Enviar pedido</span>
          </Button>
        </div>
      </section>

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
