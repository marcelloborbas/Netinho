import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Settings, LogIn } from "lucide-react";
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
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  const canSell = access?.can_sell === true || access?.level === 1;
  const userName = access?.name?.trim().split(/\s+/)[0];
  const actions = [
    { label: "Vender", icon: ShoppingCart, to: canSell ? "/vendas" : "/auth", search: { modo: "venda" as const } },
    { label: "Orçamento", icon: FilePenLine, to: canSell ? "/vendas" : "/auth", search: { modo: "consulta" as const } },
    { label: "Clientes", icon: Users, to: canSell ? "/clientes" : "/auth", search: {} },
    { label: "Meus Pedidos", icon: ClipboardList, to: canSell ? "/pedidos" : "/auth", search: {} },
  ];
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <PromotionBanner />
        <section className="journey-choice rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5" aria-labelledby="vender-orcar-title">
          <h2 id="vender-orcar-title" className="mb-3 text-center text-xl font-bold text-[#102a52] sm:text-2xl">{userName ? "Sr. " + userName + ", quer Vender ou Orçar ?" : "Sr. usuário, quer Vender ou Orçar ?"}</h2>
          <nav aria-label="Ações comerciais" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {actions.map(({ label, icon: Icon, to, search }) => (
              <Link key={label} to={to} search={search} className="action-card home-action-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] p-3 text-center font-bold text-[#102a52] shadow-sm transition-transform hover:scale-[1.03] hover:bg-[#dbeafe]">
                <Icon className="h-7 w-7 text-[#174e9b]" aria-hidden="true"/>
                <span className="text-sm font-bold sm:text-base">{label}</span>
              </Link>
            ))}
          </nav>
        </section>
      </main>
      <PublicFooter />   </div>
  );
}
