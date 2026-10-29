import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/BrandHeader";
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
  const [footerHeight, setFooterHeight] = useState(66);
  useEffect(() => {
    const footer = document.querySelector<HTMLElement>(".mobile-nav");
    if (!footer) return;
    const update = () => setFooterHeight(Math.max(0, window.innerHeight - footer.getBoundingClientRect().top));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
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
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-5 px-1.5 pt-8 pb-2 sm:gap-6 sm:px-6 sm:pt-10 sm:pb-5">
        <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d5e0ee] bg-white px-3 py-4 text-center shadow-lg" aria-label="Boas-vindas ao Netinho">
          <h2 className="text-[clamp(1.5rem,6.5vw,2.25rem)] font-black leading-tight text-[#102a52] tracking-tight">{salutation}, Sr. {userName || "usuário"}, é bom tê-lo conosco.</h2>
          <p className="mt-2 text-base font-semibold leading-snug text-[#102a52] sm:text-xl">Que seu dia seja abençoado!</p>
        </section>
        <div className="flex w-full flex-1 items-start justify-center pt-4 sm:pt-6"><HomePartsCarousel /></div>

      </main>
      <button type="button" className="home-lia-help-image" style={{ bottom: footerHeight }} onClick={() => window.dispatchEvent(new Event("netinho:lia-help"))} aria-label="Abrir ajuda da LIA" title="Clique para ouvir a LIA">
        <img src="/images/Lia%20Aponta%20para%20a%20Ajuda.webp" alt="LIA: Quer ajuda, clique em seu ícone!" decoding="async" />
      </button>
      <PublicFooter />   </div>
  );
}
