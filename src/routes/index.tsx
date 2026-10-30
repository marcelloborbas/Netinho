import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
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
      <main className="flex w-full flex-1 flex-col items-center gap-4 px-3 pt-4 pb-24 sm:gap-6 sm:px-6 sm:pt-7">
        <section className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[24px] border border-[#d5e1ee] bg-[#102e54] bg-[url('/images/fundo-saudacao.webp')] bg-cover bg-center px-5 py-6 text-left text-white shadow-[0_12px_26px_rgba(5,30,65,0.24)] sm:px-8 sm:py-8" aria-label="Boas-vindas ao Netinho">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071d3bd9] via-[#102e54a8] to-[#102e541a]" aria-hidden="true" />

          <div className="relative flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#f8d878]"><Sparkles size={15} /> Netinho Auto Parts</div>
          <h1 className="relative mt-3 text-[clamp(1.5rem,5.8vw,2.3rem)] font-black leading-[1.2] tracking-tight">{salutation}, Sr. {userName || "usuário"}!</h1>
          <p className="relative mt-2 text-[13px] font-semibold text-[#dce9f8] sm:text-base">É bom tê-lo conosco. Que seu dia seja abençoado!</p>
          <div className="relative mt-4 h-[3px] w-24 rounded-full bg-gradient-to-r from-[#f2bb2d] to-transparent" />
        </section>
        <section className="w-full min-w-0 max-w-3xl" aria-label="Imagens de produtos em rotação automática">
          <HomePartsCarousel />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
