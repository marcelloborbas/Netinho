import { useEffect, useState, type ReactNode } from "react";
import { UserRound, LogOut, ShieldCheck, Mail, BriefcaseBusiness } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
// from "@tanstack/react-router";

import { Logo } from "@/components/Logo";
import { PartnerLogos } from "@/components/PartnerLogos";

export function BrandHeader({ actions }: { actions?: ReactNode }) {
  const navigate = useNavigate();
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  const profile = access?.level === 1 ? "Administrador" : access?.can_sell && access?.attribution === "Representante" ? "Representante" : access?.can_sell ? "Vendedor" : "Visitante";
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [user, setUser] = useState<{ name: string; picture: string | null } | null>(null);
  useEffect(() => {
    let mounted = true;
    const sync = (session: { user?: { user_metadata?: Record<string, unknown>; email?: string } } | null) => {
      if (!mounted) return;
      const u = session?.user;
      if (!u) { setUser(null); return; }
      const meta: Record<string, unknown> = u.user_metadata ?? {};
      const picture = meta["avatar_url"] ?? meta["picture"];
      const name = meta["full_name"] ?? meta["name"] ?? u.email ?? "Usuário";
      setUser({ name: String(name), picture: typeof picture === "string" && picture.startsWith("https://") ? picture : null });
    };
    void supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => sync(session));
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  async function signOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) { window.alert("Não foi possível sair. Tente novamente."); return; }
    setMenuOpen(false);
    localStorage.removeItem("netinho-vendedor");
    void navigate({ to: "/auth" });
  }
  return (
    <header className="app-header brand-header">
      <div className="brand-header-inner">
        <div className="flex min-w-0 shrink-0 flex-col items-start gap-0.5">
          <Link to="/" aria-label="Início Netinho" className="brand-header-home">
            <Logo className="brand-header-logo" showPhone />
          </Link>


        </div>
        <div className="brand-header-representations min-w-0">
          <div className="flex w-full items-center justify-end gap-2 sm:gap-3">
            <div className="flex shrink-0 flex-col items-center gap-1">
              <p className="m-0 text-center text-[9px] font-bold leading-tight whitespace-nowrap sm:text-[10px]">Representante Oficial</p>
              <PartnerLogos compact downloads linked={false} />
            </div>
          {user && (
            <div className="relative flex shrink-0 items-center justify-end">
              <button type="button" onClick={() => { setMenuOpen((open) => !open); setProfileDetailsOpen(false); }} aria-expanded={menuOpen} aria-haspopup="menu" aria-label={`Abrir opções de ${user.name}`} title={user.name} className="flex items-center gap-1 rounded-full border-2 border-white/50 p-0.5">
                {user.picture ? <img src={user.picture} alt={`Foto de ${user.name}`} referrerPolicy="no-referrer" className="h-[62px] w-[62px] rounded-full object-cover" /> : <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white/15 text-white"><UserRound size={35} /></span>}
              </button>
              {menuOpen && (
                <div role="menu" aria-label="Opções do usuário" className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                  <button role="menuitem" type="button" onClick={() => setProfileDetailsOpen((open) => !open)} aria-expanded={profileDetailsOpen} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100"><ShieldCheck size={18} /> Perfil: {profile}</button>
                  {profileDetailsOpen && <div className="mx-1 mb-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800" role="region" aria-label="Permissões do perfil">
                    <strong>Permissões:</strong> {access?.level === 1 ? "Gerenciar usuários, permissões, catálogo e pedidos." : access?.can_sell && access?.attribution === "Representante" ? "Vender, consultar pedidos e supervisionar vendedores vinculados." : access?.can_sell ? "Vender, consultar clientes e acompanhar seus pedidos." : "Visualizar o catálogo e consultar peças, sem comprar ou enviar pedidos."}
                  </div>
                  <button role="menuitem" type="button" disabled={signingOut} onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><LogOut size={18} /> {signingOut ? "Saindo..." : "Sair"}</button>
                </div>
              )}
            </div>
          )}
          </div>
          {actions && <div className="brand-header-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
