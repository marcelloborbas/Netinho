import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Settings, MessageCircle, LogIn } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BrandFooter } from "@/components/BrandFooter";
import { accessQuery } from "@/lib/access";
import { BRAND } from "@/lib/brand";
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
      <header className="app-header brand-header">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
          <div className="flex flex-col items-start gap-0.5">
            <Link to="/" aria-label="Netinho Auto Parts - Início"><Logo className="brand-header-logo" /></Link>
            <a href={`https://wa.me/${BRAND.phoneDigits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 sm:text-sm" aria-label="Conversar pelo WhatsApp">
              <MessageCircle size={15} /> {BRAND.phone}
            </a>
          </div>
          <nav aria-label="Menu principal" className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
            <Link to="/" className="rounded-lg border border-white/20 px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm">Início</Link>
            <Link to="/catalogo" search={{ modo: "consulta" }} className="rounded-lg border border-white/20 px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:text-sm">Catálogo</Link>
            {access?.level === 1 && <Link to="/admin" title="Administração" aria-label="Abrir Administração" className="rounded-full border border-amber-400/60 bg-[#102a52] p-2 text-amber-300 transition-transform hover:scale-110"><Settings size={21}/></Link>}
            {!access && <Link to="/auth" title="Entrar" aria-label="Fazer login" className="rounded-full border border-white/30 p-2 text-white"><LogIn size={21}/></Link>}
          </nav>
        </div>
      </header>
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
      <BrandFooter />
    </div>
  );
}
