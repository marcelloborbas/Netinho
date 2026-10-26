import { createFileRoute } from "@tanstack/react-router";
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
  const { data: access } = useQuery({ ...accessQuery, retry: false, refetchInterval: 60000 });
  const previousLevel = useRef<string | null>(null);
  useEffect(() => {
    if (!access) return;
    const current = `${access.level}:${access.can_sell}`;
    if (previousLevel.current !== null && previousLevel.current !== current && (access.can_sell || access.level === 1)) toast.success("Seu acesso foi atualizado! Confira os perfis disponíveis.");
    previousLevel.current = current;
  }, [access]);
  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      const meta = user?.user_metadata;
      const candidate = meta?.full_name || meta?.name || meta?.given_name || "";
      const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") || "";
      setAccountName(String(candidate || emailName).trim());
    }).catch(() => {});
  }, []);
  const rawName = accountName || access?.name?.trim() || "";
  const firstName = rawName.split(/\s+/)[0]?.trim();
  const userName = firstName && !["usuário", "usuario", "visitante"].includes(firstName.toLowerCase()) ? firstName : "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 px-1.5 py-2 sm:gap-4 sm:px-6 sm:py-5">
        <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d5e0ee] bg-white px-3 py-4 text-center shadow-lg" aria-label="Boas-vindas ao Netinho">
          <h2 className="text-3xl font-black leading-tight text-[#102a52] drop-shadow-[0_0_9px_rgba(250,204,21,0.6)] sm:text-4xl">{userName ? `${greeting}, Sr. ${userName}!` : `${greeting}!`}</h2>
        </section>
        <HomePartsCarousel />

      </main>
      <PublicFooter />   </div>
  );
}
