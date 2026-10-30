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
    { to: "/pedido" as const, label: "Pedido", icon: ShoppingCart },
    { to: "/pedidos" as const, label: "Vendas", icon: ClipboardList },
    { to: "/auth" as const, label: "Sair", icon: LogOut },
  ];
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Não foi possível sair."); return; }
    localStorage.removeItem("netinho-vendedor");
    void navigate({ to: "/auth" });
  }
  return <nav aria-label="Menu inferior" className="mobile-nav !border-t !border-[#215c9b] !bg-gradient-to-b !from-[#092b57] !via-[#061c3b] !to-[#031126] !shadow-[0_-5px_22px_rgba(0,58,132,0.24)]" style={{ gridTemplateColumns: `repeat(${links.length}, 1fr)` }}>
    {links.map(({to,label,icon:Icon}) => label === "Sair" ? <button key={label} type="button" onClick={() => { clickSound(); void logout(); }} aria-label="Sair da conta" className="group relative flex min-h-[66px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-[#174e9b]/30 hover:text-[#ffdc55]"><Icon size={24} strokeWidth={2.3} className="transition-transform duration-200 group-active:scale-90 group-hover:scale-110"/>{label}</button> : <Link key={label} to={to} preload="intent" onMouseEnter={to === "/catalogo" ? prepareCatalog : undefined} onFocus={to === "/catalogo" ? prepareCatalog : undefined} onTouchStart={to === "/catalogo" ? prepareCatalog : undefined} onClick={clickSound}
      aria-current={pathname === to ? "page" : undefined}
      className={`group relative flex min-h-[66px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-all duration-200 hover:bg-[#174e9b]/30 hover:text-[#ffdc55] ${pathname === to ? "text-[#ffdc55]" : "text-white"}`}>
      <Icon size={25} strokeWidth={pathname === to ? 2.7 : 2.1} className={`transition-transform duration-200 group-active:scale-90 group-hover:scale-110 ${pathname === to ? "drop-shadow-[0_0_7px_rgba(255,211,56,0.6)]" : ""}`}/>{label}
      {pathname === to && <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[#ffd43b] shadow-[0_0_9px_2px_rgba(255,212,59,0.65)]" />}
    </Link>)}

  </nav>;
}
