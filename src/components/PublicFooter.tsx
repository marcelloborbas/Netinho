import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { Home, Search, ShoppingCart, ClipboardList, CircleHelp, LogOut, UserRound, Settings, ShieldCheck, Download, Contact, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
import { BRAND } from "@/lib/brand";
import { HOME_ICON_SIZE, HOME_ICON_STROKE } from "@/components/HomeIconTile";

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
  const status = access?.level === 1 || access?.attribution === "Administrador" ? "Administrador" : access?.attribution === "Representante" ? "Representante" : access?.attribution === "Vendedor" || access?.can_sell ? "Vendedor" : "Visitante";
  const {data:activeState}=useQuery({queryKey:["footer-active-user",user?.name],enabled:!!user&&menuOpen,staleTime:120000,queryFn:async()=>{const {data:auth}=await supabase.auth.getUser();if(!auth.user)return null;const {data,error}=await supabase.from("profiles").select("access_active").eq("id",auth.user.id).maybeSingle();if(error)throw error;return data?.access_active??null;}});
  const { data: commissionRate } = useQuery({
    queryKey: ["footer-commission", user?.name],
    enabled: !!user && menuOpen,
    staleTime: 120000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase.from("salesperson_commission_rates" as never).select("rate").eq("user_id", auth.user.id).maybeSingle();
      if (error) throw error;
      const value = (data as { rate?: number | string } | null)?.rate;
      const rate = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
      return Number.isFinite(rate) ? rate : null;
    },
  });
  const isVisitor = !!access && status === "Visitante";
  const displayedCommission = status === "Administrador" ? 3.5 : commissionRate;
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
    { to: "/catalogo" as const, label: "Pedido", icon: ShoppingCart },
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
      <div className="border-b border-slate-200 px-2 py-3">
        <div className="flex items-center justify-between gap-2">
          <strong className="min-w-0 truncate text-sm" title={user?.name ?? "Visitante"}>{(user?.name ?? "Visitante").trim().split(/\s+/)[0]}</strong>
          <div className="flex shrink-0 items-center gap-2">
            {activeState != null && <span className={activeState ? "text-xs font-bold text-green-700" : "text-xs font-bold text-red-700"}>{activeState ? "Ativo" : "Inativo"}</span>}
            {displayedCommission != null && <span className="rounded-lg border-2 border-[#d4af37] bg-[#fff0a3] px-2 py-1 text-sm font-black text-[#6d4800] shadow-sm">{displayedCommission.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%</span>}
          </div>
        </div>
        <p className="mt-1 text-xs font-semibold text-[#8a6516]">{status}</p>
      </div>
      <Link role="menuitem" to="/cartao-visita" onClick={() => { setMenuOpen(false); clickSound(); }} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold ${isVisitor ? "text-slate-400" : "hover:bg-slate-100"}`}><Contact size={19}/> Cartão de visita</Link>
      <Link role="menuitem" to="/downloads" onClick={() => { setMenuOpen(false); clickSound(); }} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold ${isVisitor ? "text-slate-400" : "hover:bg-slate-100"}`}><Download size={19}/> Downloads</Link>
      <a role="menuitem" href={`https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent("Olá, Netinho Auto Parts! Gostaria de atendimento.")}`} target="_blank" rel="noopener noreferrer" onClick={() => { setMenuOpen(false); clickSound(); }} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-[#147c40] hover:bg-green-50"><MessageCircle size={19} fill="#25D366" stroke="#147c40"/> WhatsApp</a>
      <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event("netinho:lia-help")); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-slate-100"><CircleHelp size={19}/> Ajuda</button>
      {access?.level === 1 && <Link role="menuitem" to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-slate-100"><Settings size={19}/> Administração</Link>}
      {user && <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); clickSound(); void logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut size={19}/> Sair</button>}
      {!user && <Link role="menuitem" to="/auth" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-slate-100"><ShieldCheck size={19}/> Entrar</Link>}
    </div>}
    {/* Navegação fixa: ícones Lucide dourados, mesmo tamanho e traço, sobre azul-marinho. */}
    <nav aria-label="Menu inferior" className="mobile-nav !border-t !border-gold/40 !bg-navy-deep" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
      {links.map(({to,label,icon:Icon}) => {
        const disabled = isVisitor && label === "Vendas";
        const current = pathname === to;
        return <Link key={label} to={to} preload="intent" onClick={() => { clickSound(); if (label === "Pedido") prepareCatalog(); }} aria-current={current ? "page" : undefined} className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold transition-colors sm:text-[13px] ${disabled ? "!text-muted-foreground" : "hover:bg-navy-soft/40"}`}>
          <Icon size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} absoluteStrokeWidth aria-hidden="true" className={disabled ? "text-muted-foreground" : "text-gold"} />{label}
          {current && <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gold"/>}
        </Link>;
      })}
      <button type="button" aria-label="Abrir menu do perfil" aria-expanded={menuOpen} onClick={() => { clickSound(); setMenuOpen(v => !v); }} className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold hover:bg-navy-soft/40 sm:text-[13px]">
        {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full border-2 border-gold object-cover shadow-sm" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextElementSibling?.classList.remove("hidden"); }} /> : null}<UserRound size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} absoluteStrokeWidth aria-hidden="true" className={user?.picture ? "hidden text-gold" : "text-gold"} />
        <span>Perfil</span>
      </button>
    </nav>
  </>;
}
