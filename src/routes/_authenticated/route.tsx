import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
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
  Settings,
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";

import { brl } from "@/lib/brand";
import { useDraft, draftTotals, draftActions } from "@/lib/order-store";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user && !["/catalogo", "/representantes"].includes(location.pathname)) throw redirect({ to: "/auth" });
    if (!data.user) return { user: null, access: null };
    if (data.user) draftActions.switchAccount(data.user.id);
    const access = await context.queryClient.fetchQuery(accessQuery);
    if (location.pathname === "/admin" || location.pathname === "/admin-gestao") {
      if (access.level !== 1) throw redirect({ to: "/catalogo" });
    }
    if (!access.can_sell && access.level !== 1 && !["/catalogo", "/representantes"].includes(location.pathname)) throw redirect({ to: "/catalogo" });
    return { user: data.user, access };
  },
  component: AppShell,
});
function AppShell() {
  const draft = useDraft();
  // Read the location once: hooks must never be called conditionally.
  const pathname = useLocation().pathname;
  const hideFooter = ["/admin", "/admin-gestao", "/clientes", "/pedidos"].includes(pathname);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: access } = useQuery({ ...accessQuery, enabled: !!Route.useRouteContext().user, retry: false });
  const canSell = access?.can_sell === true || access?.level === 1;
  const nav = canSell
    ? ([
        { to: "/" as const, label: "Início", icon: Home },
        { to: "/catalogo" as const, label: "Catálogo", icon: Search },
        { to: "/vendas" as const, label: "Vender", icon: ShoppingCart },
        { to: "/pedidos" as const, label: "Pedidos", icon: ClipboardList },
        { to: "/admin" as const, label: "Adm", icon: Settings },
      ] as const)
    : ([
        { to: "/" as const, label: "Início", icon: Home },
        { to: "/catalogo" as const, label: "Catálogo", icon: Search },
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
    <div className={pathname === "/admin" ? "flex min-h-screen flex-col pb-0" : "flex min-h-screen flex-col pb-36 md:pb-28"}>
      <BrandHeader />
      <div className="app-navigation-bar">
        <nav aria-label="Navegação da área" className="flex items-center gap-1">
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
        <button onClick={logout} className="app-navigation-logout" aria-label="Sair da conta">
          <LogOut size={18} /> Sair
        </button>
      </div>
      <main className={pathname === "/admin" ? "mx-auto w-full max-w-7xl flex-1 px-4 py-3 sm:px-6" : "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6"}>
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
