import { Link, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { Home, Search, ShoppingCart, ClipboardList, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

function clickSound() {
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    osc.onended = () => { void ctx.close(); };
  } catch { /* Som opcional, navegação permanece funcional. */ }
}

/** Rodapé único das páginas públicas, seguindo o modelo da página inicial. */
export function PublicFooter() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prepareCatalog = () => {
    // Busca antecipada somente quando o usuário demonstra intenção de abrir o catálogo.
    // O React Query reutiliza a consulta em andamento e respeita o cache existente.
    void Promise.all([
      queryClient.prefetchQuery(productsQuery),
      queryClient.prefetchQuery(categoriesQuery),
    ]);
  };
  const links = [
    { to: "/" as const, label: "Início", icon: Home },
    { to: "/catalogo" as const, label: "Catálogo", icon: Search },
    { to: "/vendas" as const, label: "Vender", icon: ShoppingCart },
    { to: "/pedidos" as const, label: "Pedidos", icon: ClipboardList },
    { to: "/auth" as const, label: "Sair", icon: LogOut },
  ];
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Não foi possível sair."); return; }
    localStorage.removeItem("netinho-vendedor");
    void navigate({ to: "/auth" });
  }
  return <nav aria-label="Menu inferior" className="mobile-nav" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}>
    {links.map(({to,label,icon:Icon}) => label === "Sair" ? <button key={label} type="button" onClick={() => { clickSound(); void logout(); }} aria-label="Sair da conta" className="flex flex-col items-center gap-1 py-3 text-[11px] text-white transition-colors duration-150 hover:bg-[#174e9b] hover:text-amber-300"><Icon size={21}/>{label}</button> : <Link key={label} to={to} preload="intent" onMouseEnter={to === "/catalogo" ? prepareCatalog : undefined} onFocus={to === "/catalogo" ? prepareCatalog : undefined} onTouchStart={to === "/catalogo" ? prepareCatalog : undefined} onClick={clickSound}
      aria-current={pathname === to ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-3 text-[11px] transition-colors duration-150 hover:bg-[#174e9b] hover:text-amber-300 ${pathname === to ? "text-amber-300" : "text-white"}`}>
      <Icon size={21}/>{label}
    </Link>)}

  </nav>;
}
