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
          <img src="/images/netinho-cabecalho-arte-aprovada.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" onError={e => { e.currentTarget.src="/images/fundo-saudacao.webp"; }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#03152be8] via-[#062345a6] to-transparent" />
          <div className="absolute left-3 top-3 z-10 sm:left-6 sm:top-5"><img src="/images/Logo%20Netinho.webp" alt="Netinho Auto Parts" className="h-auto w-[92px] max-w-[26vw] object-contain drop-shadow-[0_3px_9px_rgba(0,0,0,.7)] sm:w-[150px]" /></div>
          <div className="relative flex min-h-[235px] flex-col justify-end px-4 pb-6 pt-24 sm:min-h-[340px] sm:px-8 sm:pb-10 sm:pt-28">
            <p className="text-base font-bold text-white drop-shadow-lg sm:text-xl">{salutation},</p>
            <h1 className="max-w-[18ch] text-[clamp(1.8rem,7vw,3.5rem)] font-black leading-tight text-[#ffd13e] drop-shadow-[0_2px_5px_#06152e]">Sr. {userName || "usuário"}!</h1>
            <span className="mt-1 inline-flex w-fit rounded-full border border-[#f6c94d]/70 bg-[#051d39]/75 px-3 py-1 text-xs font-bold text-[#ffe18c]">{status}</span>
            <p className="mt-2 text-sm font-semibold text-white drop-shadow-lg sm:text-lg">É bom tê-lo conosco.</p>
            <p className="text-sm font-semibold text-white drop-shadow-lg sm:text-lg">Que seu dia seja abençoado!</p>
            <span className="mt-3 h-[3px] w-20 rounded-full bg-[#ffd43b]" />
          </div>
        </section>
        <section className="mx-2 overflow-hidden rounded-[20px] border-2 border-white/90 bg-white shadow-[0_0_18px_#40a9ff99] sm:mx-4" aria-label="Promoções em destaque">
          <HomePartsCarousel />
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4" aria-label="Montadoras">
          {[
            {name:"Volkswagen",image:"/images/veiculos/volkswagen/polo.webp"},
            {name:"Fiat",image:"/images/veiculos/fiat/argo.webp"},
            {name:"Chevrolet",image:""},
            {name:"Ford",image:""},
          ].map((brand,i)=><button key={brand.name} type="button" onClick={() => void navigate({to:"/catalogo"})} className={`min-w-0 overflow-hidden rounded-xl border bg-gradient-to-b from-[#07528c] via-[#072c5b] to-[#031832] px-1 pb-2 pt-1.5 text-center shadow-[inset_0_1px_8px_#2099f366] transition hover:brightness-125 ${i===0?"border-[#ffd23c] shadow-[0_0_12px_#ffd23c]":"border-[#3b8ac2]"}`}>
              <span className="flex aspect-[1.3] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-[#206da6] to-[#062446]">{brand.image?<img src={brand.image} alt="" className="h-full w-full object-contain" loading="lazy"/>:<CarFront className="h-10 w-10 text-[#b8d6f2]"/>}</span>
              <span className="mt-1 block truncate text-[10px] font-bold leading-tight text-white sm:text-sm">{brand.name}</span>
            </button>)}
        </section>
        <section className="grid grid-cols-4 gap-1.5 px-2 sm:gap-3 sm:px-4" aria-label="Categorias de peças">
          {[
            {name:"Freios",image:"/images/categorias/Rolamento de Roda.webp"},
            {name:"Atuador de Embreagem",image:"/images/categorias/Atuador de Embreagem.webp"},
            {name:"Bobina de Ignição",image:"/images/categorias/Bobina de Ignição.webp"},
            {name:"Direção",image:"/images/categorias/Bomba de direção.webp"},
          ].map(part=><button key={part.name} type="button" onClick={() => void navigate({to:"/catalogo"})} className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-gradient-to-b from-white to-[#d6ebff] p-1 text-center text-[#08264a] shadow-[0_3px_10px_#02183155] transition hover:brightness-105">
            <span className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white"><img src={part.image} alt="" loading="lazy" className="h-full w-full object-contain"/></span>
            <span className="flex min-h-[2.5em] flex-1 items-center justify-center text-[9px] font-extrabold leading-tight sm:text-sm">{part.name}</span>
            <span className="mt-1 block w-full rounded-full bg-gradient-to-b from-[#ffe56e] to-[#ffc325] py-1 text-[9px] font-extrabold sm:text-xs">Ver peças</span>
          </button>)}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
