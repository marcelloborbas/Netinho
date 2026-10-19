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
} from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { greeting } from "@/components/ProfileAvatar";
import { brl } from "@/lib/brand";
import { useDraft, draftTotals, draftActions } from "@/lib/order-store";
import { accessQuery, selectedProfile } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user && location.pathname !== "/catalogo") throw redirect({ to: "/auth" });
    if (!data.user) return { user: null, access: null };
    if (data.user) draftActions.switchAccount(data.user.id);
    const access = await context.queryClient.fetchQuery(accessQuery);
    if (location.pathname === "/admin") {
      if (access.level !== 1) throw redirect({ to: "/catalogo" });
    } else if (location.pathname !== "/catalogo" && !selectedProfile(access.email)) throw redirect({ to: "/auth" });
    if (!access.can_sell && access.level !== 1 && location.pathname !== "/catalogo") throw redirect({ to: "/catalogo" });
    return { user: data.user, access };
  },
  component: AppShell,
});
function AppShell() {
  const draft = useDraft();
  const hideFooter = ["/admin", "/clientes", "/pedidos"].includes(useLocation().pathname);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: access } = useQuery({ ...accessQuery, enabled: !!Route.useRouteContext().user, retry: false });
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
    <div className="flex min-h-screen flex-col pb-36 md:pb-28">
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <p className="operator-banner">{greeting(access?.name?.trim().split(/\s+/)[0] || "Visitante")}</p>
        <Outlet />
      </main>
      {!hideFooter && <BrandFooter />}
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
      <nav className="mobile-nav" style={{ gridTemplateColumns: `repeat(${nav.length + (access?.level === 1 ? 2 : 1)}, 1fr)` }}>
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
        {access?.level === 1 && (
          <Link to="/admin" className="flex flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground" aria-label="Administração">
            <Shield size={21} /> Admin
          </Link>
        )}
        <button onClick={logout} className="flex flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground" aria-label="Sair da conta">
          <LogOut size={21} /> Sair
        </button>
      </nav>
    </div>
  );
}
