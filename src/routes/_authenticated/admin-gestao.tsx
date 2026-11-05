import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { Users, ClipboardList, UserRound, BriefcaseBusiness, Warehouse, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-gestao")({
  component: Admin,
  head: () => ({ meta: [{ title: "Administração | Netinho Auto Parts" }] }),
});

const actions = [
  { label: "Pessoas e Comissões", description: "Perfis, comissões e áreas de atuação", to: "/pessoas", Icon: Users },
  { label: "Pedidos", description: "Acompanhar pedidos e solicitações", to: "/admin-pedidos", Icon: ClipboardList },
  { label: "Clientes", description: "Consultar cadastros comerciais", to: "/clientes", Icon: UserRound },
  { label: "Vendedores", description: "Equipe e acompanhamento de vendas", to: "/vendedores", Icon: BriefcaseBusiness },
  { label: "Distribuidoras", description: "Parceiros e fornecedores", to: "/distribuidoras", Icon: Warehouse },
] as const;

function Admin() {
  const { data: me, isLoading } = useQuery(meQuery);
  if (isLoading) return <p className="p-5">Carregando administração…</p>;
  if (!me?.isAdmin) return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;
  return <main className="mx-auto w-full max-w-5xl space-y-5 px-3 py-5 pb-28 text-[#102a52] sm:px-6">
      <AdminPageNavigation/>
    <header className="rounded-[1.6rem] border-2 border-[#d9aa30] bg-gradient-to-br from-[#153e75] to-[#06162e] px-5 py-6 text-center text-white shadow-xl">
      <h1 className="text-2xl font-black sm:text-3xl">Painel Administrativo</h1>
    </header>
    <section aria-label="Áreas de administração" className="rounded-[1.6rem] border border-[#d7dfe8] bg-white p-3 shadow-lg sm:p-5">
      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map(({label,to,Icon},index) => <Link key={to} to={to} className={`group flex min-h-24 items-center gap-3 rounded-2xl border border-[#d9aa30]/60 bg-gradient-to-r from-[#fffef8] to-[#f7f9fc] p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#bc8d25] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:p-4 ${index===0?"sm:col-span-2":""}`}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#174c89] to-[#081f43] text-[#f9d875] shadow-md"><Icon size={26}/></span>
          <span className="min-w-0 flex-1 text-sm font-extrabold leading-snug sm:text-base">{label}</span>
          <ChevronRight className="shrink-0 text-[#b88928] transition-transform group-hover:translate-x-1" size={22}/>
        </Link>)}
      </nav>
    </section>
  </main>;
}
