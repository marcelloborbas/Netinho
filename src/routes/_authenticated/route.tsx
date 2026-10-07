import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, Users, ClipboardList, ShoppingCart, LogOut, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { brl } from "@/lib/brand";
import { useDraft, draftTotals } from "@/lib/order-store";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("netinho-vendedor");
      if (!raw) throw redirect({ to: "/auth" });
      try {
        const profile = JSON.parse(raw) as { accessType?: string };
        if (profile.accessType !== "Vendedor") throw redirect({ to: "/" });
      } catch (error) {
        if (error && typeof error === "object" && "isRedirect" in error) throw error;
        throw redirect({ to: "/auth" });
      }
    }
    // O catálogo é público após a identificação local do visitante.
    // Não depende de sessão Supabase para montar a rota.
    return { user: null };
  },
  component: AppShell,
});

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/catalogo", label: "Produtos", icon: Search },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
] as const;

function AppShell() {
  const draft = useDraft();
  const totals = draftTotals(draft);
  const navigate = useNavigate();
  const { data: me } = useQuery(meQuery);

  function logout() {
    localStorage.removeItem("netinho-vendedor");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen pb-36 md:pb-24">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}>{n.label}</Link>
            ))}
            {me?.isAdmin && (
              <Link to="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}>Admin</Link>
            )}
          </nav>
          <div className="flex items-center gap-1">
            {me?.isAdmin && (
              <Link to="/admin" className="rounded-md p-2 text-muted-foreground md:hidden" aria-label="Administração"><Shield className="h-5 w-5" /></Link>
            )}
            <button onClick={logout} className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5"><Outlet /></main>

      {draft.items.length > 0 && (
        <Link to="/pedido"
          className="fixed inset-x-3 bottom-[4.5rem] z-30 flex items-center justify-between rounded-xl bg-gradient-red px-4 py-3 text-primary-foreground shadow-glow md:bottom-4 md:left-auto md:right-6 md:w-96">
          <span className="flex items-center gap-2 font-semibold"><ShoppingCart className="h-5 w-5" />
            Meu pedido · {draft.items.length} {draft.items.length === 1 ? "item" : "itens"}</span>
          <span className="font-display text-xl font-bold">{brl(totals.net)}</span>
        </Link>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
