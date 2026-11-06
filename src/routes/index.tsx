import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { HomePartsCarousel } from "@/components/HomePartsCarousel";
import { PublicFooter } from "@/components/PublicFooter";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [hour, setHour] = useState<number | null>(null);
  const [representativeBannerReady, setRepresentativeBannerReady] = useState(true);
  useEffect(() => {
    const refreshGreeting = () => setHour(new Date().getHours());
    refreshGreeting();
    const timer = window.setInterval(refreshGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const salutation = hour === null ? "Olá" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  // A sessão do Supabase, e não uma flag temporária da aba, determina o acesso.
  // PWAs iniciados pelo ícone podem abrir em uma nova sessão sem sessionStorage anterior.
  const [entryApproved, setEntryApproved] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("netinho-entry-approved") === "1");
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) void navigate({ to: "/auth", replace: true }); }, 10000);
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      window.clearTimeout(timeout);
      if (data.session?.user) {
        window.sessionStorage.setItem("netinho-entry-approved", "1");
        setEntryApproved(true);
      } else {
        window.sessionStorage.removeItem("netinho-entry-approved");
        setEntryApproved(false);
        void navigate({ to: "/auth", replace: true });
      }
    }).catch(() => { if (active) { window.clearTimeout(timeout); void navigate({ to: "/auth", replace: true }); } });
    return () => { active = false; window.clearTimeout(timeout); };
  }, [navigate]);
  const { data: access } = useQuery({ ...accessQuery, enabled: entryApproved, retry: false });
  const previousLevel = useRef<string | null>(null);
  useEffect(() => {
    if (!access) return;
    const current = `${access.level}:${access.can_sell}`;
    if (previousLevel.current !== null && previousLevel.current !== current && (access.can_sell || access.level === 1)) toast.success("Seu acesso foi atualizado! Confira os perfis disponíveis.");
    previousLevel.current = current;
  }, [access]);
  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    let active = true;
    const readName = (user: { user_metadata?: Record<string, unknown>; email?: string } | null | undefined) => {
      if (!active) return;
      const meta = user?.user_metadata ?? {};
      const candidate = [meta["full_name"], meta["name"], meta["given_name"], meta["display_name"]]
        .find((value) => typeof value === "string" && value.trim());
      const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "";
      setAccountName(String(candidate || emailName).trim());
    };
    if (entryApproved) void supabase.auth.getSession().then(({ data }) => readName(data.session?.user)).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      readName(session?.user);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [entryApproved]);
  const savedName = (() => {
    if (typeof window === "undefined") return "";
    try {
      const profile = JSON.parse(localStorage.getItem("netinho-vendedor") || "null");
      return typeof profile?.name === "string" ? profile.name.trim() : "";
    } catch { return ""; }
  })();
  const validName = (value: string) => {
    const first = value.split(/\s+/)[0]?.trim() || "";
    return first && !["usuário", "usuario", "visitante", "sr.", "sr"].includes(first.toLowerCase()) ? first : "";
  };
  const userName = validName(accountName) || validName(access?.name || "") || validName(savedName);
  // Alterna a cor do destaque a cada dia, sem depender de uma chamada externa.
  const dailyNameColors = ["#ffe083", "#7ee7ff", "#ffc1e3", "#b8ffb0", "#ffd0a1", "#d4c3ff", "#fff2a6"];
  const dailyNameColor = dailyNameColors[Math.floor(Date.now() / 86_400_000) % dailyNameColors.length];
  const status = access?.level === 1 || access?.attribution === "Administrador"
    ? "Administrador"
    : access?.attribution === "Representante" ? "Representante"
    : access?.attribution === "Vendedor" ? "Vendedor"
    : access?.can_sell ? "Vendedor" : "Visitante";
  if (!entryApproved) return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0b1f3f] px-6 text-center text-white"><img src="/images/Logo%20Netinho.webp" alt="Netinho Auto Parts" className="w-44 max-w-full" /><p className="text-base font-semibold">Verificando seu acesso…</p><button type="button" onClick={() => void navigate({ to: "/auth", replace: true })} className="rounded-xl bg-[#facc15] px-5 py-3 font-bold text-[#102a52]">Ir para o login</button></main>;
  return (
    <div className="home-page flex min-h-[100dvh] flex-col">
      <main className="relative flex w-full max-w-none flex-1 flex-col gap-3 overflow-x-hidden bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e7edf4] pb-24 text-[#102a52] sm:gap-4">
        <section className="relative isolate min-h-[420px] overflow-hidden bg-[#071e3c] sm:min-h-[520px] lg:min-h-[620px] xl:min-h-[700px]" aria-label="Boas-vindas">
          <img src="/images/fundo-saudacao-novo.webp" alt="Estrada ao pôr do sol com caminhão e automóvel" className="absolute inset-0 h-full w-full object-cover object-center" decoding="async" fetchPriority="high" />
          <div className="relative z-10 flex min-h-[310px] w-full flex-col justify-end gap-1 bg-gradient-to-t from-[#06152e]/85 via-[#06152e]/45 to-transparent px-4 pb-6 pt-12 text-white sm:min-h-[520px] sm:px-8 sm:pb-8 lg:min-h-[620px] xl:min-h-[700px] lg:px-12">

<p className="flex w-full min-w-0 flex-col items-start gap-1 text-[clamp(19px,5vw,25px)] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-white drop-shadow-lg">
  <span className="shrink-0">{salutation}, Sr.</span>
  <span
    className="block max-w-full break-words text-[clamp(46px,12vw,72px)] leading-[1.02] sm:text-[clamp(4rem,7vw,7rem)] font-black animate-pulse motion-reduce:animate-none drop-shadow-[0_0_16px_currentColor]"
    style={{ color: dailyNameColor }}
    title={userName || "usuário"}
  >
    {userName || "usuário"}!
  </span>
</p>
<p className="mt-2 text-[clamp(19px,5vw,22px)] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-white drop-shadow-lg">
  É bom tê-lo conosco.
</p>
<p className="text-[clamp(19px,5vw,22px)] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-[#ffe083] drop-shadow-lg">
  Que seu dia seja abençoado!
</p>

          </div>
        </section>
        <section className="mx-3 overflow-hidden rounded-[18px] border border-[#d4af37]/60 bg-[#071b36] shadow-[0_8px_26px_rgba(7,27,54,.18)] sm:mx-6" aria-label="Promoções em destaque">
          <HomePartsCarousel />
        </section>
        <section className="flex min-h-[42dvh] flex-1 px-3 pb-3 pt-1 sm:min-h-[360px] sm:px-6 sm:pb-6" aria-label="Encontre seu representante">
          <button
            type="button"
            onClick={() => void navigate({ to: "/representantes" })}
            aria-label="Encontre seu representante. Abrir o mapa de representantes"
            className="group relative flex w-full min-h-[42dvh] flex-1 items-center justify-center overflow-hidden rounded-[22px] border border-[#d4af37]/70 bg-[#071b36] text-left shadow-[0_10px_30px_rgba(7,27,54,.18)] transition-shadow hover:shadow-[0_14px_34px_rgba(7,27,54,.28)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#d4af37] sm:min-h-[280px]"
          >
            {representativeBannerReady ? (
              <img
                src="/images/encontre-seu-representante.webp"
                alt="Encontre seu Representante — mapa do Brasil"
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
                decoding="async"
                onError={() => setRepresentativeBannerReady(false)}
              />
            ) : (
              <span className="flex flex-col items-center gap-2 px-5 py-8 text-center">
                <span className="text-xs font-bold uppercase tracking-[.2em] text-[#d4af37]">Atendimento em sua região</span>
                <span className="font-display text-[clamp(30px,7vw,64px)] font-black leading-tight text-white">Encontre seu <span className="text-[#f1ce67]">Representante</span></span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">Ver representantes <ArrowRight size={18} /></span>
              </span>
            )}
          </button>
        </section>
      </main>
      <a
        href={`https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent("Olá, Netinho Auto Parts! Gostaria de atendimento.")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a Netinho pelo WhatsApp"
        title="Fale com a Netinho pelo WhatsApp"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#25D366] text-white shadow-[0_4px_18px_#0006] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] motion-safe:animate-pulse sm:bottom-24 sm:right-6"
      >
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9 fill-current"><path d="M16 .8A15.1 15.1 0 0 0 3.05 23.7L1 31l7.5-1.97A15.18 15.18 0 1 0 16 .8Zm0 27.5a12.3 12.3 0 0 1-6.26-1.72l-.45-.27-4.45 1.17 1.19-4.33-.29-.46A12.36 12.36 0 1 1 16 28.3Zm6.78-9.24c-.37-.18-2.2-1.08-2.54-1.2-.34-.12-.59-.18-.83.18-.25.37-.95 1.2-1.16 1.45-.22.24-.43.28-.8.09-.37-.18-1.57-.58-2.99-1.85-1.1-.99-1.85-2.21-2.07-2.58-.21-.37-.02-.57.16-.75.17-.16.37-.43.56-.65.19-.21.25-.37.37-.61.12-.25.06-.46-.03-.65-.09-.18-.83-2-.1-2.73-.27-.71-.24-.61-.46-.62-.21-.01-.46-.01-.71-.01s-.65.09-.99.46c-.34.37-1.29 1.26-1.29 3.07s1.32 3.56 1.5 3.81c.19.24 2.59 3.96 6.28 5.55.88.38 1.56.6 2.09.77.88.28 1.68.24 2.31.15.71-.1 2.2-.9 2.51-1.77.31-.87.31-1.61.22-1.77-.09-.15-.34-.24-.71-.43Z"/></svg>
      </a>
      <PublicFooter />
    </div>
  );
}
