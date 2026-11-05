import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { Users, ClipboardList, UserRound, BriefcaseBusiness, Warehouse, MapPinned, ShieldCheck, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-gestao")({
  component: Admin,
  head: () => ({ meta: [{ title: "Administração | Netinho Auto Parts" }] }),
});

const actions = [
  { label: "Abrir fichas de pessoas e comissões", description: "Perfis, comissões e áreas de atuação", to: "/pessoas", Icon: Users },
  { label: "Pedidos", description: "Acompanhar pedidos e solicitações", to: "/pedidos", Icon: ClipboardList },
  { label: "Clientes", description: "Consultar cadastros comerciais", to: "/clientes", Icon: UserRound },
  { label: "Vendedores", description: "Equipe e acompanhamento de vendas", to: "/vendedores", Icon: BriefcaseBusiness },
  { label: "Distribuidoras", description: "Parceiros e fornecedores", to: "/distribuidoras", Icon: Warehouse },
] as const;

function Admin() {
  const { data: me, isLoading } = useQuery(meQuery);
  if (isLoading) return <p className="p-5">Carregando administração…</p>;
  if (!me?.isAdmin) return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;
  return <main className="mx-auto w-full max-w-5xl space-y-5 px-3 py-5 pb-28 text-[#102a52] sm:px-6">
    <header className="relative overflow-hidden rounded-[1.6rem] border-2 border-[#d9aa30] bg-gradient-to-br from-[#153e75] via-[#08244a] to-[#06162e] px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[#f8cf5d]/10 blur-2xl"/>
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#edc861]/50 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#f9d875]"><ShieldCheck size={14}/> PAINEL ADMINISTRATIVO</span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Administração</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85">Gestão de pessoas, vendas e parceiros em um só lugar.</p>
        </div>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f6d16b]/60 bg-white/10 text-[#f9d875] shadow-inner"><MapPinned size={28}/></span>
      </div>
      <div className="relative mt-6 h-1 rounded-full bg-gradient-to-r from-[#c98c22] via-[#ffe394] to-transparent"/>
    </header>
    <section aria-label="Áreas de administração" className="rounded-[1.6rem] border border-[#d7dfe8] bg-white p-3 shadow-lg sm:p-5">
      <div className="mb-4 px-2 pt-2">
        <h2 className="text-lg font-black">Central de gerenciamento</h2>
        <p className="mt-1 text-xs text-slate-600">Escolha uma área para consultar ou editar seus registros.</p>
      </div>
      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map(({label,description,to,Icon},index) => <Link key={to} to={to} className={`group flex min-h-24 items-center gap-3 rounded-2xl border border-[#d9aa30]/60 bg-gradient-to-r from-[#fffef8] to-[#f7f9fc] p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#bc8d25] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:p-4 ${index===0?"sm:col-span-2":""}`}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#174c89] to-[#081f43] text-[#f9d875] shadow-md"><Icon size={26}/></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold leading-snug sm:text-base">{label}</span>
            <span className="mt-1 block text-xs leading-snug text-slate-600">{description}</span>
          </span>
          <ChevronRight className="shrink-0 text-[#b88928] transition-transform group-hover:translate-x-1" size={22}/>
        </Link>)}
      </nav>
    </section>
  </main>;
}
