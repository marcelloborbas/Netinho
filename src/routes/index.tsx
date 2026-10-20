import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Search, MessageCircle, ShieldCheck } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";

import { accessQuery } from "@/lib/access";
import { PromotionBanner } from "@/components/PromotionBanner";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [
    { title: "Início | Netinho Auto Parts" },
    { name: "description", content: "Acesse clientes, vendas, orçamentos, pedidos e campanhas Netinho Auto Parts." },
  ] }),
  component: Home,
});

function Home() {
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  const userName = access?.name?.trim().split(/\s+/)[0];
  const isAdmin = access?.level === 1;
  const canSell = access?.can_sell === true || isAdmin;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const requestMessage = `Olá, equipe Netinho Auto Parts! Meu nome é ${access?.name || "Usuário"} e meu e-mail Google é ${access?.email || "não informado"}. Gostaria de solicitar autorização para atuar como representante ou vendedor e acessar as funções de vendas e orçamentos. Aguardo orientações.`;
  const requestUrl = `https://wa.me/5515992458492?text=${encodeURIComponent(requestMessage)}`;
  const actions = [
    { label: "Vender", icon: ShoppingCart, to: canSell ? "/vendas" : "/representante", search: { modo: "venda" as const } },
    { label: "Orçamento", icon: FilePenLine, to: canSell ? "/vendas" : "/representante", search: { modo: "consulta" as const } },
    { label: "Clientes", icon: Users, to: "/clientes", search: {} },
    { label: "Meus Pedidos", icon: ClipboardList, to: "/pedidos", search: {} },
  ];
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        {!isAdmin && <PromotionBanner />}
        {isAdmin && <section className="rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm" aria-label="Escolher área de acesso">
          <h2 className="mb-3 text-center text-xl font-extrabold text-[#102a52]">{greeting}, {userName || "administrador"}! Como deseja entrar?</h2>
          <nav className="grid grid-cols-2 gap-3" aria-label="Administração ou vendas">
            <Link to="/admin" className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#174e9b] bg-[#eaf2ff] p-3 text-center font-extrabold text-[#102a52] hover:bg-[#dbeafe]"><ShieldCheck size={30}/> Administração</Link>
            <Link to="/vendas" search={{ modo: "venda", q: "", promo: "" }} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#174e9b] bg-[#eaf2ff] p-3 text-center font-extrabold text-[#102a52] hover:bg-[#dbeafe]"><ShoppingCart size={30}/> Vender</Link>
          </nav>
        </section>}
        {!isAdmin && <section className="journey-choice rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5" aria-labelledby="vender-orcar-title">
          <h2 id="vender-orcar-title" className="mb-3 text-center text-xl font-bold text-[#102a52] sm:text-2xl">{greeting}, {userName || "usuário"}! {canSell ? "O que deseja fazer?" : "Veja o catálogo abaixo."}</h2>
          {!canSell ? (
            <div className="space-y-3">
              <Link to="/catalogo" className="flex min-h-20 items-center justify-center gap-3 rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] p-4 text-center text-lg font-extrabold text-[#102a52] shadow-sm hover:bg-[#dbeafe]">
                <Search size={27} aria-hidden="true"/> Catálogo
              </Link>
              <p className="text-center text-sm text-[#102a52]">Deseja vender ou fazer orçamentos? Solicite sua autorização como representante ou vendedor.</p>
              <a href={requestUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#137c45] p-3 text-center text-sm font-bold text-white shadow-sm hover:bg-[#0d6336]">
                <MessageCircle size={21} aria-hidden="true"/> Solicitar acesso para vendas pelo WhatsApp
              </a>
            </div>
          ) : (
            <nav aria-label="Ações comerciais" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {actions.map(({ label, icon: Icon, to, search }) => (
                <Link key={label} to={to} search={search} className="action-card home-action-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] p-3 text-center font-bold !text-[#102a52] shadow-sm transition-transform hover:scale-[1.03] hover:bg-[#dbeafe]">
                  <Icon className="h-7 w-7 text-[#174e9b]" aria-hidden="true"/>
                  <span className="text-sm font-bold sm:text-base">{label}</span>
                </Link>
              ))}
            </nav>
          )}
        </section>}
      </main>
      <PublicFooter />   </div>
  );
}
