import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Contact, Users, Package, Settings, UserCog, Building2, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração – NETINHO" }] }),
  component: AdminDashboard,
});

const options = [
  { to: "/representantes", label: "Representantes / Vendedores", icon: Contact },
  { to: "/clientes", label: "Clientes", icon: UserCog },
  { to: "/transportadoras", label: "Transportadoras", icon: Building2 },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
] as const;

function AdminDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 pb-12">
      <header className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-amber-400/70 bg-gradient-to-r from-[#102a52] via-[#173a6c] to-[#102a52] px-6 py-5 text-center shadow-[0_8px_28px_rgba(0,0,0,.35)]">
        <h1 className="text-3xl font-extrabold uppercase tracking-wider text-amber-300 sm:text-4xl">Administração</h1>
      </header>
      <nav aria-label="Acessos da administração" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {options.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="action-card flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-white/20 p-4 text-center font-bold transition-transform hover:scale-[1.03]">
            <Icon size={30} className="text-amber-300" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
        <Link to="/admin-gestao" className="action-card flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-white/20 p-4 text-center font-bold transition-transform hover:scale-[1.03]">
          <Settings size={30} className="text-amber-300" aria-hidden="true" />
          <span>Configurações e cadastros</span>
        </Link>
        <Link to="/admin-gestao" hash="produtos" className="action-card flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-white/20 p-4 text-center font-bold transition-transform hover:scale-[1.03]">
          <Package size={30} className="text-amber-300" aria-hidden="true" />
          <span>Produtos, estoque e preços</span>
        </Link>
      </nav>
      <nav aria-label="Menu inferior da administração" className="mt-auto flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/15 bg-[#0b1f3f] p-3">
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white hover:bg-white/10"><Home size={19} /> Início</Link>
        <Link to="/admin-gestao" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white hover:bg-white/10"><Settings size={19} /> Gerenciar</Link>
        <Link to="/pedidos" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white hover:bg-white/10"><ClipboardList size={19} /> Pedidos</Link>
      </nav>
    </div>
  );
}
