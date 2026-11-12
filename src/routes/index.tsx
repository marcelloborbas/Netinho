import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { HomePartsCarousel } from "@/components/HomePartsCarousel";
import { HomeSalesEvolution } from "@/components/HomeSalesEvolution";
import { MapPinned } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { BRAND } from "@/lib/brand";
import { pageHead } from "@/lib/page-head";
import { homeShareImage } from "@/lib/home-share-image";

export const Route = createFileRoute("/")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      ...pageHead("/", "Netinho Auto Parts | Catálogo de Peças e Representantes", "Netinho Auto Parts: consulte nosso catálogo de autopeças, faça pedidos e encontre um representante em sua região.").meta,
      { property: "og:image", content: homeShareImage.url },
      { property: "og:image:secure_url", content: homeShareImage.url },
      { property: "og:image:type", content: homeShareImage.type },
      { property: "og:image:width", content: homeShareImage.width },
      { property: "og:image:height", content: homeShareImage.height },
      { property: "og:image:alt", content: "Netinho Auto Parts" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: homeShareImage.url },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [hour, setHour] = useState<number | null>(null);
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
      <main className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-2 overflow-x-hidden bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e7edf4] pb-[82px] text-[#102a52] sm:gap-3 sm:pb-24">
        <section className="relative isolate h-[29dvh] min-h-[210px] shrink-0 overflow-hidden bg-[#071e3c] sm:h-[clamp(260px,30vw,380px)] sm:min-h-0" aria-label="Boas-vindas">
          <img src="/images/fundo-saudacao-novo.webp" alt="Estrada ao pôr do sol com caminhão e automóvel" className="absolute inset-0 h-full w-full object-cover object-center" decoding="async" fetchPriority="high" />
          <div className="relative z-10 flex h-full min-h-0 w-full flex-col justify-end gap-1 bg-gradient-to-t from-[#06152e]/85 via-[#06152e]/45 to-transparent px-4 pb-6 pt-12 text-white sm:px-7 sm:pb-6 lg:px-10">

<p className="flex w-full min-w-0 flex-nowrap items-baseline gap-x-1.5 whitespace-nowrap text-[clamp(13px,3.6vw,19px)] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-white drop-shadow-lg">
  <span className="shrink-0">{salutation}, Sr.</span>
  <span
    className="inline-block min-w-0 truncate text-[clamp(25px,7vw,38px)] leading-[1.05] sm:text-[clamp(2.2rem,4.5vw,4.8rem)] font-black animate-pulse motion-reduce:animate-none drop-shadow-[0_0_16px_currentColor]"
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
        <section className="mx-3 h-[24dvh] min-h-[155px] shrink-0 overflow-hidden rounded-[26px] border-[3px] border-[#ffce2c] bg-gradient-to-b from-[#0a5aab] via-[#06316d] to-[#021844] shadow-[0_4px_0_#a96e00,0_5px_20px_#002a6c88] sm:mx-6 sm:h-[clamp(190px,25vw,310px)] sm:min-h-0" aria-label="Promoções em destaque">
          <HomePartsCarousel />
        </section>
        <HomeSalesEvolution />
        <section className="mx-3 flex items-center justify-between gap-3 px-1 py-3 sm:mx-6 sm:gap-6 sm:px-3" aria-label="Representantes e logotipos das montadoras">
          <style>{`@keyframes netinho-chrome-pulse {0%,100% {filter:drop-shadow(0 0 2px rgba(212,175,55,.5)) drop-shadow(0 3px 3px rgba(0,0,0,.55))} 50% {filter:drop-shadow(0 0 9px rgba(255,225,117,.95)) drop-shadow(0 0 3px rgba(255,255,255,.85)) drop-shadow(0 3px 5px rgba(0,0,0,.65))}} @media (prefers-reduced-motion:reduce){.netinho-chrome-pulse{animation:none!important}}`}</style>
          <a href="/representantes-mapa" className="flex min-w-0 flex-1 items-center justify-center transition hover:scale-105 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4af37]" aria-label="Abrir mapa dos representantes pelo Brasil" title="Representantes pelo Brasil">
            <img src="/images/logos-montadoras/representantes-3d.webp" alt="Representantes pelo Brasil" loading="lazy" decoding="async" className="netinho-chrome-pulse block h-14 w-full max-w-[88px] object-contain sm:h-20 sm:max-w-28" style={{animation:"netinho-chrome-pulse 2.8s ease-in-out infinite"}}/>
          </a>
          {(["volkswagen","fiat"] as const).map((brand,index)=><div key={brand} className="flex min-w-0 flex-1 items-center justify-center" title={brand.charAt(0).toUpperCase()+brand.slice(1)}>
            <img src={`/images/logos-montadoras/${brand}-3d.webp`} alt={`Logotipo 3D ${brand}`} loading="lazy" decoding="async" className="netinho-chrome-pulse block h-14 w-full max-w-[88px] object-contain sm:h-20 sm:max-w-28" style={{animation:`netinho-chrome-pulse 2.8s ease-in-out ${(index+1)*0.3}s infinite`}}/>
          </div>)}
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
