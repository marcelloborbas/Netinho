import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, ChevronRight, CarFront, ArrowRight, Wrench, Gauge, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
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
  const { data: access } = useQuery({ ...accessQuery, enabled: entryApproved, retry: false, refetchInterval: entryApproved ? 60000 : false });
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
  if (!entryApproved) return null;
  return (
    <div className="home-page flex min-h-[100dvh] flex-col">
      <main className="relative flex w-full flex-1 flex-col items-center gap-4 overflow-x-hidden bg-gradient-to-b from-[#06172f] via-[#09264c] to-[#061a35] px-3 pb-28 pt-3 text-white sm:gap-6 sm:px-6 sm:pt-6">
        <section className="relative isolate mx-auto min-h-[260px] w-full max-w-3xl overflow-hidden rounded-[26px] border border-[#b98b3e]/70 bg-[#102e54] bg-[url('/images/fundo-saudacao.webp')] bg-cover bg-center shadow-[0_12px_32px_rgba(0,0,0,.38)] sm:min-h-[340px]" aria-label="Boas-vindas">
          <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#061529f5] via-[#09274ed8] to-[#061b3570]" />
          <div className="relative flex min-h-[260px] flex-col justify-center px-6 py-9 sm:min-h-[340px] sm:px-10">
            <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#f6cc67]"><Sparkles size={15}/> Seja bem-vindo</span>
            <h1 className="max-w-[22ch] text-[clamp(1.8rem,6.5vw,3rem)] font-black leading-tight drop-shadow-lg">{salutation}, Sr. {userName || "usuário"}!</h1>
            <p className="mt-3 text-base font-semibold text-[#f7e9c7] sm:text-xl">É bom tê-lo conosco.</p>
            <p className="mt-1 text-base font-semibold text-[#f7e9c7] sm:text-xl">Que seu dia seja abençoado!</p>
            <div className="mt-5 h-[3px] w-36 rounded-full bg-gradient-to-r from-[#e6ac40] to-transparent"/>
          </div>
        </section>
        <section className="w-full max-w-3xl" aria-label="Destaques e novidades">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h2 className="text-lg font-black text-[#f5d37c] sm:text-2xl">Peças em destaque</h2>
            <span className="text-xs font-medium text-[#cbd8eb]">Qualidade para seu veículo</span>
          </div>
          <div className="overflow-hidden rounded-[25px] border-2 border-[#b88b44] bg-gradient-to-br from-[#f6f8fc] to-[#d9e5f3] shadow-[0_14px_32px_rgba(0,0,0,.28)]">
            <HomePartsCarousel />
            <button type="button" onClick={() => void navigate({to:"/catalogo"})} className="flex w-full items-center justify-between bg-gradient-to-r from-[#d6a44d] via-[#f3d37c] to-[#d6a44d] px-5 py-3 text-left text-sm font-black text-[#09264b] transition hover:brightness-110">
              Explore nosso catálogo <ArrowRight size={20}/>
            </button>
          </div>
        </section>
        <section className="w-full max-w-3xl" aria-label="Montadoras">
          <div className="mb-3 flex items-end justify-between gap-2 px-1">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e4b35b]">Escolha sua montadora</p><h2 className="text-xl font-black sm:text-2xl">Encontre a peça certa</h2></div>
            <button type="button" onClick={() => void navigate({to:"/catalogo"})} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#f5d37c]">Ver catálogo <ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {name:"Volkswagen", image:"/images/veiculos/volkswagen/polo.webp"},
              {name:"Fiat", image:"/images/veiculos/fiat/argo.webp"},
              {name:"Chevrolet", image:""},
              {name:"Ford", image:""},
            ].map(brand => <button key={brand.name} type="button" onClick={() => void navigate({to:"/catalogo"})} className="group overflow-hidden rounded-[20px] border border-[#bd934e] bg-gradient-to-b from-[#184478] to-[#071d3c] p-2 shadow-[0_8px_18px_rgba(0,0,0,.3)] transition hover:-translate-y-1 hover:border-[#f6d37c]">
              <span className="flex h-24 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-b from-[#e7edf6] to-[#b8c8dc]">
                {brand.image ? <img src={brand.image} alt={brand.name} loading="lazy" className="h-full w-full object-contain" onError={e => {e.currentTarget.style.display="none";}}/> : <CarFront size={51} className="text-[#214e7d]"/>}
              </span>
              <span className="mt-2 block text-sm font-black text-[#f7d582]">{brand.name}</span>
            </button>)}
          </div>
        </section>
        <section className="w-full max-w-3xl" aria-label="Linhas de peças">
          <div className="mb-3 px-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e4b35b]">Tudo para seu veículo</p><h2 className="text-xl font-black sm:text-2xl">Conheça nossas peças</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {name:"Direção",image:"/images/categorias/Bomba de direção.webp",icon:Gauge},
              {name:"Embreagem",image:"/images/categorias/Atuador de Embreagem.webp",icon:Wrench},
              {name:"Ignição",image:"/images/categorias/Bobina de Ignição.webp",icon:Zap},
              {name:"Rolamentos",image:"/images/categorias/Rolamento de Roda.webp",icon:ShieldCheck},
            ].map(part => <button key={part.name} type="button" onClick={() => void navigate({to:"/catalogo"})} className="overflow-hidden rounded-[19px] border border-[#b98d46] bg-gradient-to-b from-[#133c6c] to-[#071d3a] p-2 text-left shadow-lg transition hover:-translate-y-1">
              <span className="flex h-24 items-center justify-center overflow-hidden rounded-[13px] bg-[#f5f7fb]"><img src={part.image} alt={part.name} loading="lazy" className="h-full w-full object-contain" onError={e=>{e.currentTarget.style.display="none";}}/></span>
              <span className="mt-2 flex items-center justify-between gap-1 text-xs font-extrabold text-[#f7d582] sm:text-sm">{part.name}<ChevronRight size={15}/></span>
            </button>)}
          </div>
        </section>
        <button type="button" onClick={() => void navigate({to:"/catalogo"})} className="flex w-full max-w-3xl items-center gap-4 rounded-[23px] border border-[#d9ab58] bg-gradient-to-r from-[#0d315f] to-[#174e83] px-5 py-5 text-left shadow-xl transition hover:brightness-110">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f3ce75]/60 bg-[#f3ce75]/10"><ShieldCheck size={32} className="text-[#f5d37c]"/></span>
          <span className="flex-1"><strong className="block text-base font-black text-[#f7d582] sm:text-xl">Seu veículo em boas mãos!</strong><span className="mt-1 block text-xs leading-relaxed text-[#e1eaf6] sm:text-sm">Qualidade, confiança e peças para cada necessidade.</span></span>
          <ChevronRight size={22} className="shrink-0 text-[#f7d582]"/>
        </button>
      </main>
      <PublicFooter />
    </div>
  );
}
