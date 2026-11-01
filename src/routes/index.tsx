import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, ChevronRight, CarFront } from "lucide-react";
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
      <main className="flex w-full flex-1 flex-col items-center gap-4 bg-[#edf3fa] px-3 pt-3 pb-28 sm:gap-6 sm:px-6 sm:pt-6">
        <section className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[26px] border border-[#d8b65c]/60 bg-[#102e54] bg-[url('/images/fundo-saudacao.webp')] bg-cover bg-center px-5 py-8 text-left text-white shadow-[0_12px_26px_rgba(5,30,65,0.20)] sm:px-9 sm:py-12" aria-label="Boas-vindas ao Netinho">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#061a35ed] via-[#0c2b52bb] to-[#102e5440]" aria-hidden="true" />
          <div className="relative flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#f8d878]"><Sparkles size={15} /> Seja bem-vindo</div>
          <h1 className="relative mt-3 max-w-[24ch] text-[clamp(1.65rem,6vw,2.7rem)] font-black leading-[1.17] tracking-tight">{salutation}, Sr. {userName || "usuário"}!</h1>
          <p className="relative mt-3 max-w-[32ch] text-[14px] font-semibold leading-relaxed text-[#f2e9cf] sm:text-lg">É bom tê-lo conosco.<br/>Que seu dia seja abençoado!</p>
          <div className="relative mt-5 h-[3px] w-28 rounded-full bg-gradient-to-r from-[#f2bb2d] to-transparent" />
        </section>

        <section className="w-full min-w-0 max-w-3xl overflow-hidden rounded-[24px] border border-[#d4dfec] bg-white shadow-[0_10px_24px_rgba(5,30,65,0.12)]" aria-label="Imagens de produtos em rotação automática">
          <HomePartsCarousel />
        </section>

        <section className="w-full max-w-3xl" aria-label="Marcas de veículos">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black tracking-tight text-[#102e54] sm:text-xl">Encontre peças para seu veículo</h2>
            <button type="button" onClick={() => void navigate({to:"/catalogo"})} className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#174b83]">Catálogo <ChevronRight size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {name:"Volkswagen", image:"/images/veiculos/volkswagen/polo.webp"},
              {name:"Fiat", image:"/images/veiculos/fiat/argo.webp"},
              {name:"Chevrolet", image:""},
              {name:"Ford", image:""},
            ].map((brand) => (
              <button key={brand.name} type="button" onClick={() => void navigate({to:"/catalogo"})} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#c8d9ea] bg-white p-2 text-center shadow-sm transition-transform hover:-translate-y-0.5">
                <span className="flex h-[92px] w-full items-center justify-center rounded-xl bg-[#f2f6fb]">
                  <img src={brand.image} alt={`Veículo ${brand.name}`} loading="lazy" className="h-full w-full object-contain" onError={(e)=>{e.currentTarget.style.display="none";}} />
                </span>
                <span className="mt-2 text-sm font-extrabold text-[#102e54]">{brand.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex w-full max-w-3xl items-center gap-4 rounded-[22px] border border-[#d8b65c]/50 bg-gradient-to-r from-[#071e3e] via-[#123b6b] to-[#0b2b50] px-5 py-5 text-white shadow-lg sm:px-7" aria-label="Compromisso de qualidade">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#e9c46b]/50 bg-[#e9c46b]/10"><ShieldCheck size={31} className="text-[#f1c65b]"/></span>
          <div>
            <h2 className="text-base font-black sm:text-xl">Seu veículo em boas mãos!</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#e1ebf6] sm:text-sm">Explore nosso catálogo de peças e encontre o que precisa para atender seus clientes.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
