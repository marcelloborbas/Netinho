import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery, saveProfile } from "@/lib/access";
import { greeting } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallAppButton } from "@/components/InstallAppButton";
import { PartnerLogos } from "@/components/PartnerLogos";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bem-vindo | Netinho Auto Parts" },
      {
        name: "description",
        content: "Entre com Google e conheça FCO Automotive e HD Embreagens.",
      },
      { property: "og:title", content: "Bem-vindo | Netinho Auto Parts" },
      { property: "og:description", content: "Entre com Google e conheça FCO Automotive e HD Embreagens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});
function GoogleIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.6 20.5H24v8h11.3C33.8 33.1 29.6 36 24 36a12 12 0 1 1 8.5-20.5l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
      <path fill="#34A853" d="m6.3 33 6.6-5.1A12 12 0 0 0 24 36c3 0 5.7-1 7.7-2.8l6.2 4.8A20 20 0 0 1 6.3 33Z" />
      <path fill="#FBBC05" d="m6.3 15 6.6 5.1a12 12 0 0 0 0 7.8L6.3 33a20 20 0 0 1 0-18Z" />
      <path fill="#EA4335" d="M24 4a20 20 0 0 1 14.2 5.8l-5.7 5.7A12 12 0 0 0 12.9 20l-6.6-5A20 20 0 0 1 24 4Z" />
    </svg>
  );
}
function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const showWelcome = !signedIn && !recovery;
  const { data: access, error, refetch } = useQuery({ ...accessQuery, enabled: signedIn });
  useEffect(() => {
    if (signedIn && access && !recovery) {
      saveProfile(access, access.can_sell ? "Representante Comercial" : "Visitante");
      void navigate({ to: "/" });
    }
  }, [signedIn, access, recovery, navigate]);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(!!session?.user);
      setChecking(false);
      if (event === "PASSWORD_RECOVERY") {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecovery(false);
      setPassword("");
      toast.success("Senha atualizada.");
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
  }
  return (
    <main className={showWelcome ? "welcome-auth-stage" : "auth-stage min-h-screen px-4 py-6 sm:py-10"}>
      {showWelcome && (
        <>
          <header className="welcome-auth-brands">
            <p>Representante Oficial das Marcas</p>
            <div className="welcome-brand-row">
              <Logo className="welcome-netinho-logo" />
              <PartnerLogos compact linked={false} />
            </div>
          </header>
          <img
            className="welcome-auth-art"
            src="/images/welcome-screen.webp"
            alt="Seja bem-vindo ao mundo automotivo."
          />
          <section className="welcome-auth-actions" aria-label="Acesso à Netinho">
            <h1>Faça seu login</h1>
            <button
              type="button"
              className="welcome-google-button"
              onClick={googleLogin}
              disabled={busy}
            >
              {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <GoogleIcon />}
              <span>Continuar com o Google</span>
            </button>
            <InstallAppButton className="welcome-install-button" />
          </section>
        </>
      )}
      {recovery && (
        <form onSubmit={adminLogin} className="surface-card mx-auto mt-10 w-full max-w-md space-y-4 p-5">
          <h1 className="text-xl font-bold">Recuperar acesso</h1>
          <Input
            aria-label="Nova senha"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nova senha (mínimo 8 caracteres)"
          />
          <Button disabled={busy} className="w-full">Salvar nova senha</Button>
        </form>
      )}
      {!showWelcome && checking ? (
        <div className="flex justify-center p-24">
          <LoaderCircle className="animate-spin" aria-label="Verificando sessão" />
        </div>
      ) : !showWelcome && signedIn && !recovery ? (
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
                  <p className="mt-2 text-muted-foreground">
                    Preparando suas opções de vendas e catálogos.
                  </p>
                </div>
                <button onClick={logout} className="icon-button" aria-label="Trocar conta Google">
                  <LogOut size={20} />
                </button>
              </div>
              <Button
                onClick={() => navigate({ to: "/" })}
                className="mt-6 h-14 w-full bg-gradient-red"
              >
                Continuar para minha área <ArrowRight size={18} />
              </Button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Conectado como {access.email}
              </p>
            </>
          )}
        </div>
      ) : null}
      {!showWelcome && (
        <footer className="mx-auto mt-10 max-w-5xl border-t pt-5 text-center text-xs leading-6 text-muted-foreground">
          NETINHO AUTO PARTS · FCO Automotive & HD Embreagens
          <br />
          Peças, parceria e confiança em cada pedido.
        </footer>
      )}
    </main>
  );
}
