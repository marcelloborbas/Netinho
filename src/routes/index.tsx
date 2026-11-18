import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { HomeCommercialDashboard } from "@/components/HomeCommercialDashboard";
import { Download, ChevronRight, Search, FileDown } from "lucide-react";
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
  const [partsSearch, setPartsSearch] = useState("");
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
  if (!entryApproved) return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0b1f3f] px-6 text-center text-white"><img src="/images/Logo%20Netinho.webp" alt="Netinho Auto Parts" className="w-44 max-w-full" /><div role="status" aria-live="polite" className="flex flex-col items-center gap-4"><span className="h-11 w-11 animate-spin rounded-full border-4 border-[#f3cb58]/30 border-t-[#f3cb58]" aria-hidden="true"/><p className="text-base font-semibold">Carregando sua página inicial…</p></div><button type="button" onClick={() => void navigate({ to: "/auth", replace: true })} className="rounded-xl bg-[#facc15] px-5 py-3 font-bold text-[#102a52]">Ir para o login</button></main>;
  return (
    <div className="home-page home-visual-2026 flex min-h-[100dvh] flex-col">
      <main className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-3 overflow-x-hidden bg-gradient-to-b from-[#d7e8fb] via-[#e8f2fd] to-[#dceafa] pb-[100px] text-[#102a52] sm:gap-4 sm:pb-24">
        <section className="relative isolate h-[29dvh] min-h-[210px] shrink-0 overflow-hidden bg-[#071e3c] sm:h-[clamp(260px,30vw,380px)] sm:min-h-0" aria-label="Boas-vindas">
          <img src="/images/fundo-saudacao-novo.webp" alt="Estrada ao pôr do sol com caminhão e automóvel" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" decoding="async" fetchPriority="high" />

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
        <HomeCommercialDashboard />
        <section className="mx-3 rounded-[25px] border-[3px] border-white bg-gradient-to-b from-white to-[#e6f0fc] px-3 py-3 text-[#102a52] shadow-[0_5px_14px_#254c7840] sm:mx-6 sm:px-6" aria-label="Encontre sua peça">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black sm:text-2xl"><Search className="h-7 w-7 text-[#09599f]"/>Encontre sua peça</h2>
          <form className="flex min-h-[52px] overflow-hidden rounded-full border-2 border-[#93b3d8] bg-[#edf5ff] shadow-inner" onSubmit={event=>{event.preventDefault();void navigate({to:"/catalogo",search:{q:partsSearch.trim()} });}}>
            <input aria-label="Buscar por código, peça ou veículo" value={partsSearch} onChange={event=>setPartsSearch(event.target.value)} placeholder="Busque por código, peça ou veículo..." className="min-w-0 flex-1 bg-transparent px-4 text-sm font-medium text-[#102a52] outline-none placeholder:text-[#69819c] sm:text-base"/>
            <button type="submit" aria-label="Pesquisar peças" className="flex w-16 shrink-0 items-center justify-center bg-gradient-to-b from-[#ffe98a] to-[#bd7e05] text-[#102a52] shadow-inner"><Search className="h-7 w-7"/></button>
          </form>
        </section>
        <section className="mx-3 grid grid-cols-4 gap-2 sm:mx-6 sm:gap-4" aria-label="Montadoras">
          {(["volkswagen","fiat","chevrolet","ford"] as const).map(brand=><button key={brand} type="button" onClick={()=>void navigate({to:"/catalogo",search:{q:brand}})} className="netinho-brand-tile flex aspect-square min-w-0 items-center justify-center rounded-[22px] border-[3px] border-[#e3b83d] bg-gradient-to-b from-[#ffffff] via-[#eef4fa] to-[#b5c8dc] p-1.5 shadow-[inset_0_2px_3px_#fff,0_4px_0_#c18d1d,0_7px_14px_#26496d55] transition hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102a52]" aria-label={`Ver peças da montadora ${brand}`}>
            <img src={`/images/logos-montadoras/${brand}-3d.webp`} alt={brand} loading="lazy" className="h-full w-full object-contain drop-shadow-[0_4px_3px_#0006]" />
          </button>)}
        </section>
        <section className="mx-3 grid grid-cols-2 gap-2 sm:mx-6 sm:gap-4" aria-label="Acessos rápidos">
          {[
            {label:"Representantes pelo Brasil",to:"/representantes-mapa",image:"/images/logos-montadoras/representantes-3d.webp",alt:"Representantes pelo Brasil"},
            {label:"Downloads",to:"/downloads",image:"",alt:"Downloads"}
          ].map(item=><button key={item.to} type="button" onClick={()=>void navigate({to:item.to as "/catalogo"})} className="netinho-quick-tile relative flex min-h-[125px] flex-col items-center justify-between overflow-hidden rounded-[22px] border-[3px] border-[#e8b83e] bg-gradient-to-b from-[#1680d6] via-[#064b9b] to-[#061b4b] px-1 pb-3 pt-2 text-center text-white shadow-[inset_0_2px_2px_#ffffff88,0_4px_0_#bb8019,0_8px_16px_#12355d66] sm:min-h-[185px]">
            <span className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-white/10 blur-lg"/>
            {item.image?<img src={item.image} alt={item.alt} loading="lazy" className="relative h-[76px] w-full object-contain drop-shadow-[0_5px_5px_#0008] sm:h-[110px]"/>:<span className="relative flex h-[76px] items-center justify-center sm:h-[110px]"><FileDown className="h-14 w-14 text-[#ffde67] drop-shadow-[0_3px_4px_#0008] sm:h-20 sm:w-20"/></span>}
            <span className="relative block min-h-[2.6em] text-[11px] font-black leading-tight drop-shadow-[0_2px_3px_#0009] sm:text-lg">{item.label}</span>
            <ChevronRight className="absolute bottom-3 right-1 h-4 w-4 text-[#ffdc5b] sm:h-6 sm:w-6"/>
          </button>)}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
