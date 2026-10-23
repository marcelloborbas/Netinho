import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/BrandHeader";

import { accessQuery } from "@/lib/access";
import { PromotionBanner } from "@/components/PromotionBanner";
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
  const userName = access?.name?.trim().split(/\s+/)[0];
  const isAdmin = access?.level === 1;
  const canSell = access?.can_sell === true || isAdmin;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <PromotionBanner />
        <section className="mx-auto w-full max-w-md rounded-2xl border border-amber-400/70 bg-[#102a52] p-5 text-center text-white shadow-lg" aria-label="Acesso ao Netinho">
          <h2 className="mb-4 text-xl font-bold">{greeting}, {userName || "seja bem-vindo"}!</h2>
          <div className="grid grid-cols-2 gap-3">
            {canSell ? <Link to="/vendas" search={{ modo: "venda", q: "", promo: "" }} className="rounded-xl bg-blue-600 px-3 py-4 font-extrabold text-white">Vender</Link> : <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-4 font-semibold text-white/70" title="Disponível apenas para vendedores, representantes e administradores">Vender · restrito</span>}
            <Link to="/catalogo" className="rounded-xl bg-amber-400 px-3 py-4 font-extrabold text-[#102a52]">Ver Catálogo</Link>
          </div>
          <p className="mt-3 text-xs text-blue-100">{canSell ? "As permissões de venda seguem seu perfil autorizado." : "A consulta ao catálogo é livre. Para vender, é necessária autorização."}</p>
        </section>
      </main>
      <PublicFooter />   </div>
  );
}
