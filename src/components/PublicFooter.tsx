import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { Home, Search, ShoppingCart, ClipboardList, CircleHelp, LogOut, UserRound, Settings, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
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
  const pathname = useLocation().pathname;
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; picture: string | null } | null>(null);
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  useEffect(() => {
    let mounted = true;
    const sync = (session: { user?: { user_metadata?: Record<string, unknown>; email?: string } } | null) => {
      if (!mounted) return;
      const u = session?.user;
      if (!u) { setUser(null); return; }
      const meta = u.user_metadata ?? {};
      const picture = meta["avatar_url"] ?? meta["picture"];
      setUser({ name: String(meta["full_name"] ?? meta["name"] ?? u.email ?? "Usuário"), picture: typeof picture === "string" && picture.startsWith("https://") ? picture : null });
    };
    void supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => sync(session));
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
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
  ];
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error("Não foi possível sair."); return; }
    localStorage.removeItem("netinho-vendedor");
    void navigate({ to: "/auth" });
  }
  return <>
    {menuOpen && <button type="button" aria-label="Fechar menu do usuário" className="fixed inset-0 z-[90] bg-black/20" onClick={() => setMenuOpen(false)} />}
    {menuOpen && <div role="menu" aria-label="Opções do usuário" className="fixed bottom-[76px] right-2 z-[100] w-56 max-w-[calc(100vw-16px)] rounded-2xl border-2 border-[#d4af37] bg-white p-2 text-[#102a52] shadow-2xl">
      <div className="border-b border-slate-200 px-3 py-2 text-sm font-bold">{user?.name ?? "Visitante"}</div>
      <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event("netinho:lia-help")); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-slate-100"><CircleHelp size={19}/> Ajuda</button>
      {access?.level === 1 && <Link role="menuitem" to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-slate-100"><Settings size={19}/> Administração</Link>}
      {user && <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); clickSound(); void logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut size={19}/> Sair</button>}
      {!user && <Link role="menuitem" to="/auth" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-slate-100"><ShieldCheck size={19}/> Entrar</Link>}
    </div>}
    <nav aria-label="Menu inferior" className="mobile-nav !border-t !border-[#215c9b] !bg-gradient-to-b !from-[#092b57] !via-[#061c3b] !to-[#031126] !shadow-[0_-5px_22px_rgba(0,58,132,0.24)]" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
      {links.map(({to,label,icon:Icon}) => <Link key={label} to={to} preload="intent" onMouseEnter={to === "/catalogo" ? prepareCatalog : undefined} onFocus={to === "/catalogo" ? prepareCatalog : undefined} onTouchStart={to === "/catalogo" ? prepareCatalog : undefined} onClick={clickSound} aria-current={pathname === to ? "page" : undefined} className={`group relative flex min-h-[66px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-all duration-200 hover:bg-[#174e9b]/30 hover:text-[#ffdc55] ${pathname === to ? "text-[#ffdc55]" : "text-white"}`}>
        <Icon size={23} strokeWidth={pathname === to ? 2.7 : 2.1} className={pathname === to ? "drop-shadow-[0_0_7px_rgba(255,211,56,0.6)]" : ""}/>{label}
        {pathname === to && <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-[#ffd43b] shadow-[0_0_9px_2px_rgba(255,212,59,0.65)]"/>}
      </Link>)}
      <button type="button" aria-label="Abrir menu do usuário" aria-expanded={menuOpen} onClick={() => { clickSound(); setMenuOpen(v => !v); }} className="group flex min-h-[66px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-white hover:text-[#ffdc55]">
        {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full border-2 border-[#ffd43b] object-cover shadow-[0_0_9px_rgba(255,212,59,0.5)]"/> : <UserRound size={29} className="rounded-full border border-[#ffd43b] p-1"/>}
        <span>Usuário</span>
      </button>
    </nav>
  </>;
}
