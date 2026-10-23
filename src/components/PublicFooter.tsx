import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Search, ShoppingCart, ClipboardList, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { accessQuery } from "@/lib/access";

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
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const isAdmin = access?.level === 1;
  const canSell = access?.can_sell === true || isAdmin;
  const links = canSell ? [
    { to: "/" as const, label: "Início", icon: Home },
    { to: "/catalogo" as const, label: "Catálogo", icon: Search },
    { to: "/vendas" as const, label: "Vender", icon: ShoppingCart },
    { to: "/pedidos" as const, label: "Pedidos", icon: ClipboardList },
  ] : [
    { to: "/" as const, label: "Início", icon: Home },
    { to: "/catalogo" as const, label: "Catálogo", icon: Search },
  ];
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Não foi possível sair."); return; }
    localStorage.removeItem("netinho-vendedor");
    void navigate({ to: "/auth" });
  }
  return <nav aria-label="Menu inferior" className="mobile-nav" style={{ gridTemplateColumns: `repeat(${links.length + (canSell ? 1 : 0)}, 1fr)` }}>
    {links.map(({to,label,icon:Icon}) => <Link key={label} to={to} onClick={clickSound}
      aria-current={pathname === to ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-3 text-[11px] transition-colors duration-150 hover:bg-[#174e9b] hover:text-amber-300 ${pathname === to ? "text-amber-300" : "text-white"}`}>
      <Icon size={21}/>{label}
    </Link>)}
    {canSell && <button type="button" onClick={() => { clickSound(); void logout(); }} className="flex flex-col items-center gap-1 py-3 text-[11px] text-white"><LogOut size={21}/>Sair</button>}
  </nav>;
}
