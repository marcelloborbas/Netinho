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

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Início | Netinho Auto Parts" },
    { name: "description", content: "Acesse clientes, vendas, orçamentos, pedidos e campanhas Netinho Auto Parts." },
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
  const entryApproved = typeof window !== "undefined" && window.sessionStorage.getItem("netinho-entry-approved") === "1";
  useEffect(() => {
    if (!entryApproved) void navigate({ to: "/auth", replace: true });
  }, [entryApproved, navigate]);
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
  const status = access?.level === 1 || access?.attribution === "Administrador"
    ? "Administrador"
    : access?.attribution === "Representante" ? "Representante"
    : access?.attribution === "Vendedor" ? "Vendedor"
    : access?.can_sell ? "Vendedor" : "Visitante";
  if (!entryApproved) return null;
  return (
    <div className="home-page flex min-h-[100dvh] flex-col">
      <main className="relative mx-auto flex w-full max-w-[940px] flex-1 flex-col gap-3 overflow-x-hidden bg-gradient-to-b from-[#06152e] via-[#092d59] to-[#07549a] pb-24 text-white sm:gap-4">
        <section className="relative isolate min-h-[330px] overflow-hidden bg-[#071e3c] sm:min-h-[460px]" aria-label="Boas-vindas">
          <img src="/images/fundo-saudacao-novo.webp" alt="Estrada ao pôr do sol com caminhão e automóvel" className="absolute inset-0 h-full w-full object-cover object-center" decoding="async" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03152bd9] via-[#0623458a] to-transparent" />
          <div className="relative z-10 flex min-h-[330px] flex-col justify-end px-4 pb-4 pt-16 text-white sm:min-h-[460px] sm:px-8 sm:pb-6">
            <p className="text-[clamp(3.2625rem,12.15vw,5.85rem)] font-extrabold text-white drop-shadow-lg">{salutation}, Sr. {userName || "usuário"}!</p>
            <p className="mt-1 text-[clamp(2.925rem,10.575vw,4.95rem)] font-bold text-white drop-shadow-lg">É bom tê-lo conosco.</p>
            <p className="text-[clamp(2.925rem,10.575vw,4.95rem)] font-bold text-[#ffe083] drop-shadow-lg">Que seu dia seja abençoado!</p>
          </div>
        </section>
        <section className="mx-2 overflow-hidden rounded-[14px] border border-[#5aafe9] bg-[#061b39] shadow-[0_0_14px_#40a9ff66] sm:mx-4" aria-label="Promoções em destaque">
          <HomePartsCarousel />
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4" aria-label="Montadoras">
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
            <img src={brand.image} alt={brand.name} className="block aspect-[4/5] h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
          </button>)}
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4" aria-label="Peças e quantidades">
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
      <PublicFooter />
    </div>
  );
}
