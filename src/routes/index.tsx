import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Search, MessageCircle, ShieldCheck, UserRound, BriefcaseBusiness, UserCog } from "lucide-react";
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
        <PromotionBanner />
        <section className="rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm sm:p-6" aria-label="Selecionar perfil">
          <h2 className="mb-4 text-center text-xl font-extrabold text-[#102a52] sm:text-2xl">{greeting}, {userName || "usuário"}, selecione seu Perfil</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              { label: "Visitante", icon: UserRound, to: "/catalogo", allowed: true, positive: "Acessa informações públicas e solicita atendimento.", negative: "Sem acesso a dados comerciais internos." },
              { label: "Vendedor", icon: ShoppingCart, to: "/vendas", allowed: canSell, positive: "Possui carteira de clientes e seus pedidos.", negative: "Não pode consultar nem alterar informações administrativas." },
              { label: "Representante", icon: BriefcaseBusiness, to: "/representante", allowed: canSell, positive: "Acompanha e consulta vendedores vinculados à sua equipe.", negative: "" },
              { label: "Administrador", icon: UserCog, to: "/admin", allowed: isAdmin, positive: "Gerencia, consulta e edita toda a operação.", negative: "" },
            ] as const).map(({label,icon:Icon,to,allowed,positive,negative}) => (
              <div key={label} className="flex flex-col rounded-xl border border-[#b8cee8] bg-[#f8fbff] p-3 text-center shadow-sm">
                {allowed ? <Link to={to} search={to === "/vendas" ? { modo: "venda", q: "", promo: "" } : {}} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#174e9b] bg-[#eaf2ff] p-3 font-extrabold text-[#102a52] hover:bg-[#dbeafe]"><Icon size={29}/>{label}</Link>
                : <div className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-slate-100 p-3 font-extrabold text-slate-500" aria-label={`${label}: acesso não autorizado`}><Icon size={29}/>{label}</div>}
                <p className="mt-3 text-sm font-semibold leading-snug text-[#166534]">{positive}</p>
                {negative && <p className="mt-2 text-sm font-semibold leading-snug text-[#b91c1c]">{negative}</p>}
                {!allowed && <p className="mt-auto pt-3 text-xs font-bold text-[#9a3412]">Acesso sujeito à autorização</p>}
              </div>
            ))}
          </div>
          {!canSell && <a href={requestUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#137c45] p-3 text-center text-sm font-bold text-white hover:bg-[#0d6336]"><MessageCircle size={19}/> Solicitar autorização pelo WhatsApp</a>}
        </section>
      </main>
      <PublicFooter />   </div>
  );
}
