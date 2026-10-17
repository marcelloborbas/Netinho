import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Search,
  Users,
  ClipboardList,
  ShoppingCart,
  LogOut,
  Shield,
  Contact,
} from "lucide-react";
import { PartnerLogos } from "@/components/PartnerLogos";
import { Logo } from "@/components/Logo";
import { brl } from "@/lib/brand";
import { useDraft, draftTotals, draftActions } from "@/lib/order-store";
import { accessQuery, selectedProfile } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    draftActions.switchAccount(data.user.id);
    const access = await context.queryClient.fetchQuery(accessQuery);
    if (location.pathname === "/admin") {
      if (access.level !== 1) throw redirect({ to: "/catalogo" });
    } else if (!selectedProfile(access.email)) throw redirect({ to: "/auth" });
    if (!access.can_sell && location.pathname !== "/catalogo") throw redirect({ to: "/catalogo" });
    return { user: data.user, access };
  },
  component: AppShell,
});
function AppShell() {
  const draft = useDraft();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true;
  const nav = canSell
    ? ([
        { to: "/", label: "Início", icon: Home },
        { to: "/catalogo", label: "Catálogo", icon: Search },
        { to: "/clientes", label: "Clientes", icon: Users },
        { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
      ] as const)
    : ([
        { to: "/", label: "Início", icon: Home },
        { to: "/catalogo", label: "Catálogo", icon: Search },
        { to: "/representante", label: "Representante", icon: Contact },
      ] as const);
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Não foi possível sair.");
      return;
    }
    localStorage.removeItem("netinho-vendedor");
    qc.clear();
    navigate({ to: "/auth" });
  }
  return (
    <div className="min-h-screen pb-36 md:pb-28">
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" aria-label="Início Netinho">
              <Logo />
            </Link>
            <PartnerLogos compact />
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="nav-link"
                activeProps={{ className: "nav-link active" }}
              >
                {n.label}
              </Link>
            ))}
            {access?.level === 1 && (
              <Link to="/admin" className="nav-link">
                Administração
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {access?.level === 1 && (
              <Link to="/admin" className="icon-button md:hidden" aria-label="Administração">
                <Shield size={20} />
              </Link>
            )}
            <button onClick={logout} className="icon-button" aria-label="Sair da conta">
              <LogOut size={19} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <p className="operator-banner">
          Operando como <strong>{access?.name || access?.email}</strong>
        </p>
        <Outlet />
      </main>
      {canSell && draft.items.length > 0 && (
        <Link to="/pedido" className="order-dock">
          <span className="flex items-center gap-3">
            <ShoppingCart size={20} />
            <span>
              <b className="block text-sm">Meu pedido</b>
              <span className="text-xs opacity-80">
                {draft.items.length} itens · revisar e finalizar
              </span>
            </span>
          </span>
          <b className="text-xl">{brl(draftTotals(draft).net)}</b>
        </Link>
      )}
      <nav className="mobile-nav" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon size={21} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
