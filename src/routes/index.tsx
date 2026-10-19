import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Settings, LogIn } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";

import { accessQuery } from "@/lib/access";
import { PromotionBanner } from "@/components/PromotionBanner";

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
  const actions = [
    { label: "Clientes", icon: Users, to: canSell ? "/clientes" : "/auth", search: {} },
    { label: "Vender", icon: ShoppingCart, to: canSell ? "/catalogo" : "/auth", search: { modo: "venda" as const } },
    { label: "Orçamento", icon: FilePenLine, to: canSell ? "/catalogo" : "/auth", search: { modo: "consulta" as const } },
    { label: "Meus Pedidos", icon: ClipboardList, to: canSell ? "/pedidos" : "/auth", search: {} },
  ];
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader actions={
        <div className="flex items-center gap-2">
          {access?.level === 1 && <Link to="/admin" title="Administração" aria-label="Abrir Administração" className="rounded-full border border-amber-400/60 bg-[#102a52] p-1.5 text-amber-300"><Settings size={18}/></Link>}
          {!access && <Link to="/auth" title="Entrar" aria-label="Fazer login" className="rounded-full border border-white/30 p-1.5 text-white"><LogIn size={18}/></Link>}
        </div>
      } />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <h1 className="text-center text-lg font-bold text-amber-300 sm:text-2xl">O que o Sr. deseja fazer?</h1>
        <PromotionBanner />
        <section className="journey-choice rounded-2xl border border-white/15 p-3 sm:p-5" aria-labelledby="vender-orcar-title">
          <h2 id="vender-orcar-title" className="mb-3 text-center text-xl font-bold text-white sm:text-2xl">Vender / Orçar</h2>
          <nav aria-label="Ações comerciais" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {actions.map(({ label, icon: Icon, to, search }) => (
              <Link key={label} to={to} search={search} className="action-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-amber-400/25 p-3 text-center transition-transform hover:scale-[1.03]">
                <Icon className="h-7 w-7 text-amber-300" aria-hidden="true"/>
                <span className="text-sm font-bold sm:text-base">{label}</span>
              </Link>
            ))}
          </nav>
        </section>
      </main>
      <nav aria-label="Menu inferior" className="mobile-nav" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Link to="/" className="flex flex-col items-center gap-1 py-3 text-[11px] text-amber-300"><Users size={21}/> Início</Link>
        <Link to="/catalogo" search={{ modo: "consulta" }} className="flex flex-col items-center gap-1 py-3 text-[11px] text-white"><FilePenLine size={21}/> Catálogo</Link>
        <Link to={canSell ? "/pedidos" : "/auth"} className="flex flex-col items-center gap-1 py-3 text-[11px] text-white"><ClipboardList size={21}/> Pedidos</Link>
        <Link to={access?.level === 1 ? "/admin" : "/auth"} className="flex flex-col items-center gap-1 py-3 text-[11px] text-white"><Settings size={21}/> {access?.level === 1 ? "Admin" : "Entrar"}</Link>
      </nav>
    </div>
  );
}
