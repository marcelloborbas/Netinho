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
        <section className="relative isolate min-h-[235px] overflow-hidden bg-[#092b52] sm:min-h-[340px]" aria-label="Boas-vindas">
          <img src="/images/netinho-cabecalho-arte-aprovada.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-contain object-center" onError={e => { e.currentTarget.src="/images/fundo-saudacao.webp"; }} />
          <img src="/images/Logo%20Netinho.webp" alt="" aria-hidden="true" className="absolute left-3 top-3 z-10 w-[clamp(80px,23vw,145px)] opacity-50 brightness-150 saturate-50" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#03152be8] via-[#062345a6] to-transparent" />

          <div className="relative flex min-h-[235px] flex-col justify-end px-4 pb-3 pt-2 sm:min-h-[340px] sm:px-8 sm:pb-6">
            <p className="text-[clamp(1.4rem,5vw,2rem)] font-extrabold text-white drop-shadow-lg">{salutation},</p>
            <h1 className="max-w-[18ch] text-[clamp(2.5rem,9vw,4rem)] font-black leading-tight text-[#ffd13e] drop-shadow-[0_2px_5px_#06152e]">Sr. {userName || "usuário"}!</h1>
            <span className="mt-1 inline-flex w-fit rounded-full border border-[#f6c94d]/70 bg-[#051d39]/75 px-3 py-1 text-xs font-bold text-[#ffe18c]">{status}</span>
            <p className="mt-2 text-[clamp(1rem,3.8vw,1.3rem)] font-bold text-white drop-shadow-lg">É bom tê-lo conosco.</p>
            <p className="text-[clamp(1rem,3.8vw,1.3rem)] font-bold text-white drop-shadow-lg">Que seu dia seja abençoado!</p>
            <span className="mt-3 h-[3px] w-20 rounded-full bg-[#ffd43b]" />
          </div>
        </section>
        <section className="mx-2 overflow-hidden rounded-[14px] border border-[#5aafe9] bg-[#061b39] shadow-[0_0_14px_#40a9ff66] sm:mx-4" aria-label="Promoções em destaque">
          <HomePartsCarousel />
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4" aria-label="Montadoras">
          {[
            {name:"Volkswagen",slug:"volkswagen",image:"/images/veiculos/volkswagen/polo.webp"},
            {name:"Fiat",slug:"fiat",image:"/images/veiculos/fiat/argo.webp"},
            {name:"Chevrolet",slug:"chevrolet",image:""},
            {name:"Ford",slug:"ford",image:""},
            {name:"Renault",slug:"renault",image:""},
            {name:"Hyundai",slug:"hyundai",image:""},
            {name:"Toyota",slug:"toyota",image:""},
            {name:"Honda",slug:"honda",image:""},
            {name:"Nissan",slug:"nissan",image:""},
            {name:"Peugeot",slug:"peugeot",image:""},
            {name:"Citroën",slug:"citroen",image:""},
            {name:"Jeep",slug:"jeep",image:""},
            {name:"Mitsubishi",slug:"mitsubishi",image:""},
            {name:"BMW",slug:"bmw",image:""},
            {name:"Mercedes-Benz",slug:"mercedes",image:""},
            {name:"Kia",slug:"kia",image:""},
            {name:"Land Rover",slug:"landrover",image:""},
            {name:"Volvo",slug:"volvo",image:""},
          ].map((brand) => <button
            key={brand.name}
            type="button"
            title={`Consultar peças ${brand.name}`}
            onClick={() => void navigate({to:"/catalogo"})}
            className="group relative flex min-w-0 flex-col items-center overflow-hidden rounded-xl border-2 border-[#2389c9] bg-gradient-to-b from-[#08659c] via-[#062a58] to-[#03132d] p-1.5 text-center text-white shadow-[inset_0_1px_12px_#36baff66] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ffd23c] hover:shadow-[0_0_18px_#ffca32aa] focus-visible:border-[#ffd23c] focus-visible:ring-2 focus-visible:ring-[#ffd23c] active:border-[#ffd23c]"
          >
            <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-[#147bb5] to-[#041c42] sm:h-20">
              {brand.image ? <img src={brand.image} alt="" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" /> : <CarFront aria-hidden="true" className="h-9 w-9 text-[#e5f2ff] sm:h-12 sm:w-12" />}
            </span>
            <img src={`https://cdn.simpleicons.org/${brand.slug}/white`} alt="" aria-hidden="true" loading="lazy" className="mt-1 h-6 w-8 object-contain" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
            <span className="mt-1 min-h-[28px] text-[10px] font-extrabold leading-tight sm:text-xs">{brand.name}</span>
          </button>)}
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4" aria-label="Peças e quantidades">
          {[
            {name:"Caixa de Direção",image:"/images/categorias/Caixa de Direção.webp",term:"caixa de direção"},
            {name:"Atuador de Embreagem",image:"/images/categorias/Atuador de Embreagem.webp",term:"atuador"},
            {name:"Bobina de Ignição",image:"/images/categorias/Bobina de Ignição.webp",term:"bobina"},
            {name:"Rolamento de Roda",image:"/images/categorias/Rolamento de Roda.webp",term:"rolamento de roda"},
          ].map(part=><button key={part.name} type="button" aria-label={part.name} onClick={() => void navigate({to:"/catalogo"})} className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-white p-0 text-center text-[#08264a] shadow-[0_3px_10px_#02183155]">
            <span className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-white"><img src={part.image} alt={part.name} loading="lazy" className="h-full w-full object-cover"/></span>
            <span className="block w-full rounded-full bg-[#ffd33c] py-0.5 text-[10px] font-extrabold">{countFor(part.term) === undefined ? "— peças" : `${countFor(part.term)} peças`}</span>
          </button>)}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
