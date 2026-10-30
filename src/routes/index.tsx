import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BookOpen, ClipboardList, Sparkles } from "lucide-react";
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
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-4 px-3 pt-3 pb-28 sm:gap-5 sm:px-6 sm:pt-6">
        <section className="relative w-full max-w-3xl overflow-hidden rounded-[24px] border border-[#d5e1ee] bg-gradient-to-br from-[#102e54] via-[#123e71] to-[#071b35] px-5 py-5 text-left text-white shadow-[0_12px_26px_rgba(5,30,65,0.24)] sm:px-8 sm:py-7" aria-label="Boas-vindas ao Netinho">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[25px] border-[#ffffff0a]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 right-8 h-40 w-40 rounded-full bg-[#f5bb3320] blur-3xl" aria-hidden="true" />
          <div className="relative flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#f8d878]"><Sparkles size={15} /> Netinho Auto Parts</div>
          <h1 className="relative mt-2 text-[clamp(1.5rem,5.8vw,2.3rem)] font-black leading-[1.15] tracking-tight">{salutation}, Sr. {userName || "usuário"}!</h1>
          <p className="relative mt-2 text-[13px] font-semibold text-[#dce9f8] sm:text-base">É bom tê-lo conosco. Que seu dia seja abençoado!</p>
          <div className="relative mt-4 h-[3px] w-24 rounded-full bg-gradient-to-r from-[#f2bb2d] to-transparent" />
        </section>
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3">
          <Link to="/catalogo" className="group flex items-center justify-between gap-2 rounded-2xl border border-[#d3dfed] bg-white px-3 py-3 shadow-[0_4px_12px_rgba(13,44,82,0.10)] transition-all hover:border-[#e4b332] hover:shadow-md sm:px-5">
            <span className="flex items-center gap-2"><span className="rounded-xl bg-[#eef4fc] p-2 text-[#163f6b]"><BookOpen size={22}/></span><span className="text-sm font-extrabold text-[#102a52]">Catálogo</span></span><ArrowRight size={16} className="shrink-0 text-[#c39a24] transition-transform group-hover:translate-x-1"/>
          </Link>
          <Link to="/pedido" className="group flex items-center justify-between gap-2 rounded-2xl border border-[#d3dfed] bg-white px-3 py-3 shadow-[0_4px_12px_rgba(13,44,82,0.10)] transition-all hover:border-[#e4b332] hover:shadow-md sm:px-5">
            <span className="flex items-center gap-2"><span className="rounded-xl bg-[#eef4fc] p-2 text-[#163f6b]"><ClipboardList size={22}/></span><span className="text-sm font-extrabold text-[#102a52]">Fazer pedido</span></span><ArrowRight size={16} className="shrink-0 text-[#c39a24] transition-transform group-hover:translate-x-1"/>
          </Link>
        </div>
        <section className="w-full max-w-3xl" aria-label="Campanhas e novidades">
          <div className="mb-2 flex items-center justify-between gap-3 px-1"><h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#102a52] sm:text-base"><span className="h-5 w-1 rounded-full bg-[#e2b32f]" />Campanhas e novidades</h2><span className="shrink-0 rounded-full bg-[#102a52] px-2.5 py-1 text-[10px] font-extrabold text-[#ffe28a]">FCO</span></div>
          <div className="overflow-hidden rounded-[20px] border border-[#d4e0ec] bg-white p-2 shadow-[0_7px_18px_rgba(15,47,88,0.12)] sm:p-4"><HomePartsCarousel /></div>
        </section>
        <button type="button" className="group mx-auto flex w-full max-w-3xl items-center justify-center gap-3 rounded-[20px] border border-[#d2dfee] bg-gradient-to-r from-white to-[#edf5ff] px-3 py-2 text-left shadow-[0_6px_18px_rgba(16,42,82,0.12)] transition-all hover:border-[#e0b332] hover:shadow-lg" onClick={() => window.dispatchEvent(new Event("netinho:lia-help"))} aria-label="Abrir ajuda da LIA">
          <img src="/images/Lia%20Aponta%20para%20a%20Ajuda.webp" alt="" className="h-24 w-28 shrink-0 object-contain object-bottom sm:h-32 sm:w-40" loading="lazy" />
          <span className="flex flex-col gap-1"><span className="text-base font-black text-[#102a52] sm:text-lg">Quer uma ajudinha?</span><span className="text-sm font-semibold text-[#496582]">A LIA está aqui para orientar você!</span><span className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#a67a08]">Abrir ajuda <ArrowRight size={14}/></span></span>
        </button>
      </main>
      <PublicFooter />
    </div>
  );
}
