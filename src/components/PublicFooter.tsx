import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FilePenLine, ClipboardList, Settings } from "lucide-react";
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
  const isAdmin = access?.level === 1;
  const canSell = access?.can_sell === true || isAdmin;
  const links = [
    { to: "/" as const, label: "Início", icon: Users, search: {} },
    { to: "/catalogo" as const, label: "Catálogo", icon: FilePenLine, search: { modo: "consulta" as const } },
    { to: (canSell ? "/pedidos" : "/auth") as "/pedidos" | "/auth", label: "Pedidos", icon: ClipboardList, search: {} },
    { to: (isAdmin ? "/admin" : "/auth") as "/admin" | "/auth", label: isAdmin ? "Admin" : "Entrar", icon: Settings, search: {} },
  ];
  return <nav aria-label="Menu inferior" className="mobile-nav" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
    {links.map(({to,label,icon:Icon,search}) => <Link key={label} to={to} search={search} onClick={clickSound}
      aria-current={(pathname === to || (pathname === "/ofertas" && label === "Início")) ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-3 text-[11px] transition-colors duration-150 hover:bg-[#174e9b] hover:text-amber-300 active:bg-[#174e9b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${pathname === to || (pathname === "/ofertas" && label === "Início") ? "text-amber-300" : "text-white"}`}>
      <Icon size={21}/>{label}
    </Link>)}
  </nav>;
}
