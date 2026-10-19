import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Contact, Users, Package, Settings, UserCog, Building2 } from "lucide-react";

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-0">
      <header className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-amber-400/70 bg-gradient-to-r from-[#102a52] via-[#173a6c] to-[#102a52] px-5 py-3 text-center shadow-[0_8px_28px_rgba(0,0,0,.35)]">
        <h1 className="text-3xl font-extrabold uppercase tracking-wider text-amber-300 sm:text-4xl">Administração</h1>
      </header>
      <nav aria-label="Acessos da administração" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="action-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-white/20 p-3 text-center font-bold transition-transform hover:scale-[1.03]">
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
    </div>
  );
}
