import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/BrandHeader";

import { accessQuery } from "@/lib/access";
import { PromotionBanner } from "@/components/PromotionBanner";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
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
  const userName = access?.name?.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <PromotionBanner />
        <section className="mx-auto w-full max-w-md rounded-2xl border border-[#d5e0ee] bg-white px-5 py-7 text-center shadow-lg" aria-label="Boas-vindas ao Netinho">
          <h2 className="text-2xl font-black leading-tight text-[#102a52] drop-shadow-[0_0_9px_rgba(250,204,21,0.6)] sm:text-3xl">{greeting}, Sr. {userName || "Usuário"}!</h2>
          <p className="mt-4 text-sm font-semibold text-[#102a52]">Permissão de vender segue o perfil autorizado.</p>
        </section>
      </main>
      <PublicFooter />   </div>
  );
}
