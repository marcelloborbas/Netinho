import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, ChevronRight, CarFront, ArrowRight, Wrench, Gauge, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { productsQuery } from "@/lib/queries";
import { HomePartsCarousel } from "@/components/HomePartsCarousel";
import { PublicFooter } from "@/components/PublicFooter";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Catálogo B2B e pedidos de autopeças | Netinho Auto Parts" },
    { name: "description", content: "Consulte o catálogo de autopeças da Netinho Auto Parts e acesse sua área para montar e acompanhar pedidos B2B." },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Catálogo B2B e pedidos de autopeças | Netinho Auto Parts" },
    { property: "og:description", content: "Consulte o catálogo de autopeças da Netinho Auto Parts e acesse sua área para montar e acompanhar pedidos B2B." },
    { property: "og:url", content: "https://www.netinhoautoparts.live/" },
    { property: "og:image", content: "https://www.netinhoautoparts.live/images/netinho-compartilhar.png?v=20261104-2" },
    { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "601" },
      { property: "og:image:height", content: "601" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Catálogo B2B e pedidos de autopeças | Netinho Auto Parts" },
    { name: "twitter:description", content: "Consulte o catálogo de autopeças da Netinho Auto Parts e acesse sua área para montar e acompanhar pedidos B2B." },
    { name: "twitter:image", content: "https://www.netinhoautoparts.live/images/netinho-compartilhar.png?v=20261104-2" },
  ] }),
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
  // O catálogo completo não deve disputar rede/CPU com a primeira pintura da página.
  // As quantidades continuam vindo dos produtos reais, mas são buscadas após a interface aparecer.
  const [loadCounts, setLoadCounts] = useState(false);
  useEffect(() => {
    if (!entryApproved) return;
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setLoadCounts(true), { timeout: 2500 });
      } else {
        setLoadCounts(true);
      }
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      if (idleId !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [entryApproved]);
  const { data: catalogProducts } = useQuery({ ...productsQuery, enabled: entryApproved && loadCounts });
  const countFor = (term: string) => catalogProducts?.filter(p => (p.categories?.name || "").toLocaleLowerCase("pt-BR").includes(term.toLocaleLowerCase("pt-BR"))).length;
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
      <main className="relative flex w-full max-w-none flex-1 flex-col gap-3 overflow-x-hidden bg-gradient-to-b from-[#06152e] via-[#092d59] to-[#07549a] pb-24 text-white sm:gap-4">
        <section className="relative isolate min-h-[420px] overflow-hidden bg-[#071e3c] sm:min-h-[520px] lg:min-h-[620px] xl:min-h-[700px]" aria-label="Boas-vindas">
          <img src="/images/fundo-saudacao-novo.webp" alt="Estrada ao pôr do sol com caminhão e automóvel" className="absolute inset-0 h-full w-full object-cover object-center" decoding="async" fetchPriority="high" />
          <div className="relative z-10 flex min-h-[310px] w-full flex-col justify-end gap-1 bg-gradient-to-t from-[#06152e]/85 via-[#06152e]/45 to-transparent px-4 pb-6 pt-12 text-white sm:min-h-[520px] sm:px-8 sm:pb-8 lg:min-h-[620px] xl:min-h-[700px] lg:px-12">

<p className="flex w-full min-w-0 items-baseline gap-[0.25em] whitespace-nowrap text-[16px] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-white drop-shadow-lg">
  <span className="shrink-0">{salutation}, Sr.</span>
  <span
    className="min-w-0 truncate text-[20px] sm:text-[clamp(1.5rem,3.8vw,3.8rem)] font-black animate-pulse motion-reduce:animate-none drop-shadow-[0_0_16px_currentColor]"
    style={{ color: dailyNameColor }}
    title={userName || "usuário"}
  >
    {userName || "usuário"}!
  </span>
</p>
<p className="mt-2 text-[16px] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-white drop-shadow-lg">
  É bom tê-lo conosco.
</p>
<p className="text-[16px] sm:text-[clamp(1.2rem,3vw,2.8rem)] leading-tight font-bold text-[#ffe083] drop-shadow-lg">
  Que seu dia seja abençoado!
</p>

          </div>
        </section>
        <section className="mx-2 overflow-hidden rounded-[14px] border border-[#5aafe9] bg-[#061b39] shadow-[0_0_14px_#40a9ff66] sm:mx-4" aria-label="Promoções em destaque">
          <HomePartsCarousel />
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4 lg:gap-5 lg:px-6" aria-label="Montadoras">
          {[
            {name:"Volkswagen",slug:"volkswagen",image:"/images/montadoras/volkswagen.webp"},
            {name:"Fiat",slug:"fiat",image:"/images/montadoras/fiat.webp"},
            {name:"Chevrolet",slug:"chevrolet",image:"/images/montadoras/chevrolet.webp"},
            {name:"Ford",slug:"ford",image:"/images/montadoras/ford.webp"},
            {name:"Renault",slug:"renault",image:"/images/montadoras/renault.webp"},
            {name:"Hyundai",slug:"hyundai",image:"/images/montadoras/hyundai.webp"},
            {name:"Toyota",slug:"toyota",image:"/images/montadoras/toyota.webp"},
            {name:"Honda",slug:"honda",image:"/images/montadoras/honda.webp"},
            {name:"Nissan",slug:"nissan",image:"/images/montadoras/nissan.webp"},
            {name:"Peugeot",slug:"peugeot",image:"/images/montadoras/peugeot.webp"},
            {name:"Citroën",slug:"citroen",image:"/images/montadoras/citroen.webp"},
            {name:"Jeep",slug:"jeep",image:"/images/montadoras/jeep.webp"},
            {name:"Mitsubishi",slug:"mitsubishi",image:"/images/montadoras/mitsubishi.webp"},
            {name:"BMW",slug:"bmw",image:"/images/montadoras/bmw.webp"},
            {name:"Mercedes-Benz",slug:"mercedes",image:"/images/montadoras/mercedes-benz.webp"},
            {name:"Kia",slug:"kia",image:"/images/montadoras/kia.webp"},
            {name:"Land Rover",slug:"landrover",image:"/images/montadoras/landrover.webp"},
            {name:"Volvo",slug:"volvo",image:"/images/montadoras/volvo.webp"},
          ].slice(0, 4).map((brand) => <button
            key={brand.name}
            type="button"
            title={`Consultar peças ${brand.name}`}
            onClick={() => void navigate({to:"/catalogo"})}
            className="group relative flex min-w-0 items-stretch overflow-hidden rounded-xl border-2 border-[#2389c9] bg-[#062a58] p-0 text-center text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ffd23c] hover:shadow-[0_0_18px_#ffca32aa] focus-visible:border-[#ffd23c] focus-visible:ring-2 focus-visible:ring-[#ffd23c] active:border-[#ffd23c]"
          >
            <img src={brand.image} alt={brand.name} className="block aspect-[4/5] h-full w-full object-cover object-center lg:aspect-[16/9] transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
          </button>)}
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4 lg:gap-5 lg:px-6" aria-label="Peças e quantidades">
          {[
            {name:"Caixa de Direção",image:"/images/categorias/Caixa de Direção.webp",term:"caixa de direção"},
            {name:"Atuador de Embreagem",image:"/images/categorias/Atuador de Embreagem.webp",term:"atuador"},
            {name:"Bobina de Ignição",image:"/images/categorias/Bobina de Ignição.webp",term:"bobina"},
            {name:"Rolamento de Roda",image:"/images/categorias/Rolamento de Roda.webp",term:"rolamento de roda"},
          ].map(part=><button key={part.name} type="button" aria-label={part.name} onClick={() => void navigate({to:"/catalogo"})} className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-white p-0 text-center text-[#08264a] shadow-[0_3px_10px_#02183155]">
            <span className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-white"><img src={part.image} alt={part.name} loading="lazy" className="block h-full w-full object-cover object-center"/></span>
            <span className="block w-full rounded-full bg-[#ffd33c] py-0.5 text-[10px] font-extrabold">{countFor(part.term) === undefined ? "— peças" : `${countFor(part.term)} peças`}</span>
          </button>)}
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
