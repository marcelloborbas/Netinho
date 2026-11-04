import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { Users, ClipboardList, UserRound, BriefcaseBusiness, Warehouse } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-gestao")({
  component: Admin,
  head: () => ({ meta: [{ title: "Administração | Netinho Auto Parts" }] }),
});

const actions = [
  { label: "Abrir fichas de pessoas e comissões", to: "/pessoas", Icon: Users },
  { label: "Pedidos", to: "/pedidos", Icon: ClipboardList },
  { label: "Clientes", to: "/clientes", Icon: UserRound },
  { label: "Vendedores", to: "/vendedores", Icon: BriefcaseBusiness },
  { label: "Distribuidoras", to: "/distribuidoras", Icon: Warehouse },
] as const;

function Admin() {
  const { data: me, isLoading } = useQuery(meQuery);
  if (isLoading) return <p className="p-5">Carregando administração…</p>;
  if (!me?.isAdmin) return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 text-[#102a52]">
    <header className="rounded-2xl bg-[#102a52] px-5 py-6 text-white">
      <h1 className="text-2xl font-black">Administração</h1>
      <p className="mt-2 text-sm text-white/90">Selecione a área que deseja administrar.</p>
    </header>
    <nav aria-label="Áreas de administração" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {actions.map(({label,to,Icon}) => <Link key={to} to={to} className="flex min-h-20 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 font-bold text-[#102a52] shadow-sm transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#102a52] text-amber-300"><Icon size={24}/></span>
        <span>{label}</span>
      </Link>)}
    </nav>
  </main>;
}
