import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgePercent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { HomeCommercialDashboard } from "@/components/HomeCommercialDashboard";
import { HomePartsCarousel } from "@/components/HomePartsCarousel";
import { PublicFooter } from "@/components/PublicFooter";
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
  const periodBlessing = hour === null ? "Que seu dia seja abençoado!" : hour < 12 ? "Que sua manhã seja abençoada!" : hour < 18 ? "Que sua tarde seja abençoada!" : "Que sua noite seja abençoada!";
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
  if (!entryApproved) return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0b1f3f] px-6 text-center text-white"><img src="/images/Logo%20Netinho.webp" alt="Netinho Auto Parts" className="w-44 max-w-full" /><div role="status" aria-live="polite" className="flex flex-col items-center gap-4"><span className="h-11 w-11 animate-spin rounded-full border-4 border-[#f3cb58]/30 border-t-[#f3cb58]" aria-hidden="true"/><p className="text-base font-semibold">Carregando sua página inicial…</p></div><button type="button" onClick={() => void navigate({ to: "/auth", replace: true })} className="rounded-xl bg-[#facc15] px-5 py-3 font-bold text-[#102a52]">Ir para o login</button></main>;
  return (
    <div className="home-page home-visual-2026 flex min-h-[100dvh] flex-col">
      <main className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-3 overflow-x-hidden bg-gradient-to-b from-[#d7e8fb] via-[#e8f2fd] to-[#dceafa] pb-[100px] text-[#102a52] sm:gap-4 sm:pb-24">
        <section className="relative isolate h-[25dvh] min-h-[175px] shrink-0 overflow-hidden bg-[#071e3c] sm:h-[clamp(260px,30vw,380px)] sm:min-h-0" aria-label="Boas-vindas">
          <img src="/images/fundo-saudacao-novo.webp" alt="Estrada ao pôr do sol com caminhão e automóvel" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" decoding="async" fetchPriority="high" />

          <div className="relative z-10 flex h-full min-h-0 w-full flex-col justify-end gap-1 bg-gradient-to-t from-[#06152e]/90 via-[#06152e]/25 to-transparent px-4 pb-4 pt-12 text-white sm:px-7 sm:pb-6 lg:px-10">

<p className="flex w-full min-w-0 flex-nowrap items-baseline gap-x-1.5 whitespace-nowrap text-[clamp(13px,3.6vw,19px)] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-white drop-shadow-lg">
  <span className="home-greeting-secondary shrink-0 italic">{salutation} Sr.</span>
  <span
    className="inline-block min-w-0 truncate text-[clamp(25px,7vw,38px)] leading-[1.05] sm:text-[clamp(2.2rem,4.5vw,4.8rem)] font-black animate-pulse motion-reduce:animate-none drop-shadow-[0_0_16px_currentColor]"
    style={{ color: dailyNameColor }}
    title={userName || "usuário"}
  >
    {userName || "usuário"}!
  </span>
</p>
<p className="home-greeting-blessing leading-tight font-bold italic text-white drop-shadow-lg">
  {periodBlessing}
</p>

          </div>
        </section>
        <HomePartsCarousel />
        <HomeCommercialDashboard mode="evolution" />
        <div className="home-brands-and-shortcuts">
        <section className="home-brand-row mx-2 grid grid-cols-4 gap-1 sm:mx-6 sm:gap-4" aria-label="Montadoras">
          {(["volkswagen","fiat","chevrolet","ford"] as const).map(brand=><button key={brand} type="button" onClick={()=>void navigate({to:"/catalogo",search:{q:brand}})} className="netinho-brand-tile flex aspect-[1.05] min-w-0 items-center justify-center rounded-[18px] bg-transparent p-0 transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102a52]" aria-label={`Ver peças da montadora ${brand}`}>
            <img src={`/images/home-premium/montadora-${brand}.webp`} alt={brand} loading="lazy" className="h-full w-full object-contain drop-shadow-[0_4px_3px_#0006]" />
          </button>)}
        </section>
        <section className="home-shortcut-row mx-2 grid grid-cols-2 gap-2 sm:mx-6 sm:gap-4" aria-label="Acessos rápidos">
          {[
            {label:"Representantes pelo Brasil",to:"/representantes-mapa",image:"/images/home-premium/representantes-brasil.webp",alt:"Representantes pelo Brasil"},
            {label:"Ofertas Especiais",to:"/ofertas",image:"",alt:"Ofertas Especiais"}
          ].map(item=><button key={item.to} type="button" onClick={()=>void navigate({to:item.to as "/catalogo"})} className="netinho-quick-tile relative block min-w-0 overflow-hidden rounded-[18px] bg-transparent p-0 transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102a52]" aria-label={item.label}>
            {item.image ? <img src={item.image} alt={item.alt} loading="lazy" className="block h-auto w-full object-contain"/> : <span className="home-special-offers-tile flex h-full w-full flex-col items-center justify-center gap-1 text-center" aria-hidden="true"><BadgePercent className="home-special-offers-icon" strokeWidth={1.8}/><span className="home-special-offers-label">OFERTAS<br/>ESPECIAIS</span></span>}
          </button>)}
        </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
