import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Contact, Package, Settings2, UserRoundCog, Truck, ShieldCheck, ArrowLeft, UserCheck, UserPlus, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração – NETINHO" }] }),
  component: AdminDashboard,
});

const options = [
  { to: "/representantes", label: "Representantes / Vendedores", icon: Contact },
  { to: "/clientes", label: "Clientes", icon: UserRoundCog },
  { to: "/transportadoras", label: "Transportadoras", icon: Truck },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
] as const;

const permissions = [
  ["Visualizar catálogo", "✓", "✓", "✓", "✓"],
  ["Pesquisar peças", "✓", "✓", "✓", "✓"],
  ["Ver preços", "—", "✓", "✓", "✓"],
  ["Consultar estoque", "—", "✓", "✓", "✓"],
  ["Cadastrar clientes", "—", "✓", "✓", "✓"],
  ["Criar pedidos", "—", "✓", "✓", "✓"],
  ["Editar pedidos em aberto", "—", "✓", "S", "✓"],
  ["Enviar pedidos", "—", "✓", "S", "✓"],
  ["Consultar histórico de vendas", "—", "Próprio", "S", "✓"],
  ["Visualizar carteira de clientes", "—", "Própria", "S", "✓"],
  ["Supervisionar vendedores", "—", "—", "S", "✓"],
  ["Consultar desempenho da equipe", "—", "—", "S", "✓"],
  ["Vincular vendedores", "—", "—", "—", "✓"],
  ["Alterar preços", "—", "—", "—", "✓"],
  ["Gerenciar catálogo", "—", "—", "—", "✓"],
  ["Administrar usuários", "—", "—", "—", "✓"],
  ["Configurar sistema", "—", "—", "—", "✓"],
] as const;

function AdminDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-5">
      <header className="relative mx-auto flex w-full max-w-2xl items-center justify-center gap-3 rounded-2xl border-2 border-amber-400/75 bg-gradient-to-br from-[#163e75] via-[#102a52] to-[#07172f] px-12 py-4 text-center shadow-[0_10px_32px_rgba(0,0,0,.4)]">
        <Link to="/" aria-label="Voltar ao início" title="Voltar" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-amber-400/50 bg-white/10 p-2 text-amber-300 transition-transform hover:scale-110"><ArrowLeft size={20}/></Link>
        <ShieldCheck size={30} className="shrink-0 text-amber-300 drop-shadow-md sm:h-9 sm:w-9" aria-hidden="true"/>
        <h1 className="text-[clamp(1.1rem,4.5vw,2.3rem)] font-black uppercase tracking-wide text-amber-300 drop-shadow-md">Administração</h1>
      </header>
      <section className="rounded-2xl border-2 border-green-400/70 bg-gradient-to-r from-[#103b34] to-[#0d2c46] p-4 text-white shadow-lg sm:p-5" aria-label="Acesso rápido à autorização de usuários">
        <div className="mb-3 flex items-center gap-3">
          <UserCheck className="h-9 w-9 shrink-0 text-green-300" />
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">Liberar acesso de usuários</h2>
            <p className="text-sm text-green-100">Consulte usuários cadastrados, autorize representantes e vendedores ou cadastre um novo acesso.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link to="/admin-gestao" hash="usuarios" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-3 text-center font-extrabold text-white hover:bg-green-700"><UserCheck size={22}/> Usuários e permissões</Link>
          <Link to="/admin-gestao" hash="representantes" className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-amber-300/70 bg-[#173d70] px-3 py-3 text-center font-extrabold text-white hover:bg-[#204c87]"><UserPlus size={22}/> Autorizar / cadastrar</Link>
        </div>
        <p className="mt-3 text-xs text-green-100">Solicitações enviadas pelo WhatsApp ainda precisam ser conferidas antes da liberação. A atribuição visual de perfil não substitui a autorização comercial.</p>
      </section>
      <nav aria-label="Acessos da administração" className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
        {options.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="group flex min-h-[clamp(100px,17vh,160px)] flex-col items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#173d70] to-[#0c2346] p-3 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-amber-400/20">
            <span className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 transition-transform group-hover:scale-110"><Icon className="h-7 w-7 text-amber-300 sm:h-9 sm:w-9" strokeWidth={1.9} aria-hidden="true"/></span>
            <span className="text-[clamp(.75rem,2.6vw,1rem)] font-bold leading-tight text-white">{label}</span>
          </Link>
        ))}
        <Link to="/admin-gestao" className="group flex min-h-[clamp(100px,17vh,160px)] flex-col items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#173d70] to-[#0c2346] p-3 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-amber-300">
          <span className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 transition-transform group-hover:scale-110"><Settings2 className="h-7 w-7 text-amber-300 sm:h-9 sm:w-9"/></span>
          <span className="text-[clamp(.75rem,2.6vw,1rem)] font-bold leading-tight text-white">Configurações e cadastros</span>
        </Link>
        <Link to="/admin-gestao" hash="produtos" className="group flex min-h-[clamp(100px,17vh,160px)] flex-col items-center justify-center gap-2 rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#173d70] to-[#0c2346] p-3 text-center shadow-lg transition-all hover:-translate-y-1 hover:border-amber-300">
          <span className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 transition-transform group-hover:scale-110"><Package className="h-7 w-7 text-amber-300 sm:h-9 sm:w-9"/></span>
          <span className="text-[clamp(.75rem,2.6vw,1rem)] font-bold leading-tight text-white">Produtos, estoque e preços</span>
        </Link>
      </nav>
      <details className="rounded-2xl border border-[#b8cee8] bg-white p-4 text-[#102a52] shadow-sm sm:p-6">
        <summary className="cursor-pointer text-lg font-extrabold">Consultar matriz de permissões</summary>
        <section className="mt-4" aria-labelledby="permissions-heading">
        <h2 id="permissions-heading" className="text-xl font-extrabold">Matriz de permissões</h2>
        <p className="mt-2 text-xs text-slate-600">✓ Permitido · — Bloqueado · S = Somente sua equipe/carteira</p>
        <p className="mt-1 text-xs text-slate-600">Matriz de referência dos perfis. As autorizações efetivas são verificadas pelo sistema e pelo banco de dados.</p>
        <div className="mt-4 w-full overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead><tr className="bg-[#eaf2ff] text-[#102a52]">
              {["Funcionalidade", "Visitante", "Vendedor", "Representante", "Admin"].map(name => <th key={name} scope="col" className="border-b border-slate-200 px-3 py-3 font-extrabold">{name}</th>)}
            </tr></thead>
            <tbody>{permissions.map(([name,...roles],index) => <tr key={name} className={index % 2 ? "bg-[#f8fbff]" : "bg-white"}>
              <th scope="row" className="border-b border-slate-100 px-3 py-3 font-medium">{name}</th>
              {roles.map((value,column) => <td key={column} className={`border-b border-slate-100 px-3 py-3 text-center font-semibold ${value === "—" ? "text-red-600" : "text-green-800"}`}>{value}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        </section>
      </details>
    </div>
  );
}
