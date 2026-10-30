import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-3 px-3 pt-4 pb-24 sm:gap-5 sm:px-6 sm:pt-6">
        <section className="w-full max-w-3xl overflow-hidden rounded-[22px] border border-[#c9d8e9] bg-gradient-to-b from-white to-[#f5f9ff] px-4 py-4 text-center shadow-[0_8px_22px_rgba(14,45,84,0.12)] sm:py-6" aria-label="Boas-vindas ao Netinho">
          <span className="mx-auto mb-2 block h-1 w-14 rounded-full bg-gradient-to-r from-[#dba52a] via-[#ffe28a] to-[#dba52a]" aria-hidden="true" />
          <h1 className="text-[clamp(1.35rem,5.4vw,2.1rem)] font-black leading-tight tracking-tight text-[#102a52]">{salutation}, Sr. {userName || "usuário"}!</h1>
          <p className="mt-1 text-[clamp(0.9rem,3.8vw,1.15rem)] font-bold text-[#25476c]">É bom tê-lo conosco.</p>
          <p className="mt-1 text-sm font-semibold text-[#526b87] sm:text-base">Que seu dia seja abençoado!</p>
        </section>
        <section className="w-full max-w-3xl" aria-label="Campanhas e novidades">
          <div className="mb-2 flex items-center gap-2 px-1"><span className="h-5 w-1 rounded-full bg-[#e0ae28]" /><h2 className="text-base font-extrabold uppercase tracking-wide text-[#102a52]">Destaques FCO Automotive</h2></div>
          <div className="overflow-hidden rounded-2xl border border-[#d4e0ec] bg-white p-2 shadow-[0_6px_18px_rgba(15,47,88,0.10)] sm:p-4"><HomePartsCarousel /></div>
        </section>
        <button type="button" className="group mx-auto flex w-full max-w-3xl items-center justify-center gap-3 rounded-2xl border border-[#cbdcf0] bg-white px-3 py-2 text-left shadow-[0_5px_16px_rgba(16,42,82,0.10)] transition-colors hover:border-[#d4af37] hover:bg-[#fffaf0]" onClick={() => window.dispatchEvent(new Event("netinho:lia-help"))} aria-label="Abrir ajuda da LIA">
          <img src="/images/Lia%20Aponta%20para%20a%20Ajuda.webp" alt="" className="h-24 w-28 shrink-0 object-contain object-bottom sm:h-32 sm:w-40" loading="lazy" />
          <span className="flex flex-col gap-1"><span className="text-base font-black text-[#102a52] sm:text-lg">Precisa de ajuda?</span><span className="text-sm font-semibold text-[#496582]">Toque aqui e fale com a LIA!</span><span className="mt-1 text-xs font-bold text-[#b4830d]">Ou acesse Ajuda pelo avatar no rodapé</span></span>
        </button>
      </main>
      <PublicFooter />
    </div>
  );
}
