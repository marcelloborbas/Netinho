import { PartnerLogos } from "@/components/PartnerLogos";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, LoaderCircle, LogOut, Settings, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery, saveProfile } from "@/lib/access";
import { Logo } from "@/components/Logo";
import { ProfileAvatar, greeting, type AccessType } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bem-vindo | Netinho Auto Parts" },
      {
        name: "description",
        content: "Entre com Google e conheça FCO Automotive e HD Embreagens.",
      },
    ],
  }),
  component: AuthPage,
});
const options: { type: AccessType; text: string; level: string }[] = [
  {
    type: "Representante Comercial",
    text: "Clientes, preços e pedidos em um só lugar.",
    level: "Nível 2 · vendas",
  },
  { type: "Visitante", text: "Explore as peças e suas aplicações.", level: "Nível 3 · consulta" },
  {
    type: "Distribuidor",
    text: "Encontre soluções para sua distribuição.",
    level: "Nível 3 · consulta",
  },
  { type: "Auto-Peças", text: "Encontre a peça certa para sua loja.", level: "Nível 3 · consulta" },
];
function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 20.5H24v8h11.3C33.8 33.1 29.6 36 24 36a12 12 0 1 1 8.5-20.5l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#34A853"
        d="m6.3 33 6.6-5.1A12 12 0 0 0 24 36c3 0 5.7-1 7.7-2.8l6.2 4.8A20 20 0 0 1 6.3 33Z"
      />
      <path fill="#FBBC05" d="m6.3 15 6.6 5.1a12 12 0 0 0 0 7.8L6.3 33a20 20 0 0 1 0-18Z" />
      <path
        fill="#EA4335"
        d="M24 4a20 20 0 0 1 14.2 5.8l-5.7 5.7A12 12 0 0 0 12.9 20l-6.6-5A20 20 0 0 1 24 4Z"
      />
    </svg>
  );
}
function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<AccessType | null>(null);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const { data: access, error, refetch } = useQuery({ ...accessQuery, enabled: signedIn });
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(!!session?.user);
      setChecking(false);
      if (event === "PASSWORD_RECOVERY") {
        setAdmin(true);
        setRecovery(true);
      }
    });
    if (window.location.hash.includes("error_description"))
      toast.error("O Google não concluiu o acesso. Tente novamente.");
    return () => data.subscription.unsubscribe();
  }, []);
  async function googleLogin() {
    // OAuth must leave the device-preview iframe before contacting Google.
    if (window.self !== window.top) {
      window.open(`${window.location.origin}/auth`, "_blank", "noopener,noreferrer");
      toast.info("Continue na nova aba e clique em Continuar com o Google.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }
  async function adminLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecovery(false);
        setPassword("");
        toast.success("Senha atualizada.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["access"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Não foi possível sair.");
      return;
    }
    localStorage.removeItem("netinho-vendedor");
    qc.clear();
    setProfile(null);
  }
  function enter() {
    if (!access || !profile) return;
    if (profile === "Representante Comercial" && !access.can_sell) return;
    saveProfile(access, profile);
    navigate({ to: "/" });
  }
  return (
    <main className="auth-stage min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Logo />
        <button
          className="icon-button"
          aria-label="Acesso administrativo"
          onClick={() => setAdmin(!admin)}
        >
          <Settings size={20} />
        </button>
      </div>
      {admin && (
        <form onSubmit={adminLogin} className="surface-card mx-auto mt-6 max-w-md space-y-3 p-5">
          <h2 className="text-xl font-bold">Administração</h2>
          {!recovery && (
            <Input
              aria-label="E-mail do administrador"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail do administrador"
            />
          )}
          <Input
            aria-label={recovery ? "Nova senha" : "Senha"}
            type="password"
            required
            minLength={recovery ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={recovery ? "Nova senha (mínimo 8 caracteres)" : "Senha"}
          />
          <Button disabled={busy} className="w-full">
            {recovery ? "Salvar nova senha" : "Entrar como administrador"}
          </Button>
          {!recovery && (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={async () => {
                if (!email.trim()) {
                  toast.error("Informe seu e-mail.");
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                  redirectTo: `${window.location.origin}/auth`,
                });
                if (error) toast.error(error.message);
                else toast.success("Solicitação enviada. Confira seu e-mail.");
              }}
            >
              Esqueci minha senha
            </button>
          )}
          {access?.level === 1 && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => navigate({ to: "/admin" })}
            >
              Abrir administração
            </Button>
          )}
        </form>
      )}
      {checking ? (
        <div className="flex justify-center p-24">
          <LoaderCircle className="animate-spin" aria-label="Verificando sessão" />
        </div>
      ) : !signedIn ? (
        <div className="mx-auto mt-8 grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div className="welcome-frame mx-auto w-full max-w-sm">
            <img
              src="/images/welcome.webp"
              alt="Netinho: seja bem-vindo ao mundo automotivo"
              className="block h-auto w-full rounded-t-3xl"
              fetchPriority="high"
            />
            <div className="space-y-3 bg-[#061c49] p-5">
              <button onClick={googleLogin} disabled={busy} className="google-button">
                <span className="google-icon-disc"><GoogleIcon /></span>
                {busy ? "Conectando..." : "Continuar com o Google"}
              </button>
              <p className="text-center text-xs leading-5 text-blue-200">
                Use sua conta Google para entrar com segurança.
              </p>
            </div>
          </div>
          <div className="welcome-partners lg:hidden">
            <p className="mb-3 text-center text-sm font-semibold text-white">Representante Oficial das Marcas</p>
            <PartnerLogos />
          </div>
          <div className="hidden lg:block">
            <span className="eyebrow">REPRESENTAÇÃO EXCLUSIVA</span>
            <h1 className="mt-5 text-6xl font-bold leading-none">
              A peça certa.
              <br />
              <span className="text-primary">O parceiro certo.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">
              FCO Automotive e HD Embreagens. Duas linhas completas, com o atendimento próximo de
              quem entende do seu negócio.
            </p>
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold">Representante Oficial das Marcas</p>
              <PartnerLogos />
            </div>
            <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck size={18} className="text-primary" /> Acesso pessoal · Atendimento
              profissional
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-10 max-w-2xl">
          {error ? (
            <div className="surface-card space-y-4 p-6">
              <h1 className="text-2xl font-bold">Não foi possível verificar seu acesso</h1>
              <p className="text-muted-foreground">
                Tente novamente. Se persistir, contate a Netinho.
              </p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
              <button onClick={logout} className="ml-4 text-sm underline">
                Trocar conta
              </button>
            </div>
          ) : !access ? (
            <p className="p-10 text-center">Preparando sua área...</p>
          ) : (
            <>
              <div className="mb-7 flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">QUE BOM TER VOCÊ AQUI</span>
                  <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                    {greeting(`sr. ${access.name.split(" ")[0]}`)}
                  </h1>
                  <p className="mt-2 text-muted-foreground">Qual seria seu perfil?</p>
                </div>
                <button onClick={logout} className="icon-button" aria-label="Trocar conta Google">
                  <LogOut size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {options.map((o) => (
                  <button
                    key={o.type}
                    onClick={() => setProfile(o.type)}
                    aria-pressed={profile === o.type}
                    className={`profile-card ${profile === o.type ? "selected" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <ProfileAvatar type={o.type} className="h-11 w-11" />
                      {profile === o.type && <Check size={18} className="text-primary" />}
                    </div>
                    <span className="mt-5 block text-base font-bold sm:text-lg">{o.type}</span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground sm:text-sm">
                      {o.text}
                    </span>
                    <span className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-metal">
                      {o.level}
                    </span>
                  </button>
                ))}
              </div>
              {profile === "Representante Comercial" && !access.can_sell && (
                <p
                  role="status"
                  className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
                >
                  Seu e-mail precisa ser autorizado pela Netinho para vender. Enquanto aguarda,
                  explore o catálogo com um perfil de consulta.
                </p>
              )}
              <Button
                onClick={enter}
                disabled={!profile || (profile === "Representante Comercial" && !access.can_sell)}
                className="mt-6 h-14 w-full bg-gradient-red text-base"
              >
                Entrar na minha área <ArrowRight size={18} />
              </Button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Conectado como {access.email}
              </p>
            </>
          )}
        </div>
      )}
      <footer className="mx-auto mt-10 max-w-5xl border-t pt-5 text-center text-xs leading-6 text-muted-foreground">
        NETINHO AUTO PARTS · FCO Automotive & HD Embreagens
        <br />
        Peças, parceria e confiança em cada pedido.
      </footer>
    </main>
  );
}
