import { PartnerLogos } from "@/components/PartnerLogos";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, LoaderCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery, saveProfile } from "@/lib/access";
import { Logo } from "@/components/Logo";
import { greeting } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

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
function GoogleIcon() {
  return (
    <span className="google-icon-tile" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.49H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.51l3.34-2.59Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"
        />
      </svg>
    </span>
  );
}
function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [register, setRegister] = useState(false);
  const [fullName, setFullName] = useState("");
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
  useEffect(() => {
    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
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
  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    toast.info(
      isAppleMobile
        ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
        : "Abra o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial.",
    );
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
      } else if (register) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        if (!data.session)
          toast.success("Cadastro solicitado. Confira seu e-mail para confirmar sua conta.");
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
  }
  return (
    <main
      className={`auth-stage ${!signedIn && !recovery ? "auth-login" : ""} min-h-screen px-4 py-6 sm:py-10`}
    >
      <header className="auth-header mx-auto max-w-md">
        <Logo className="auth-brand" />
        <div className="auth-partners">
          <p>Representante Oficial das Marcas</p>
          <PartnerLogos compact linked={false} />
        </div>
      </header>
      {(recovery || !signedIn) && (
        <form onSubmit={adminLogin} className="surface-card mx-auto mt-6 max-w-md space-y-3 p-5">
          <h1 className="text-2xl font-bold">
            {recovery ? "Recuperar acesso" : register ? "Criar minha conta" : "Faça seu Login"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {register
              ? "Informe seu nome e e-mail para se cadastrar."
              : "Use seu e-mail e senha ou acesse pelo Google"}
          </p>
          {register && !recovery && (
            <Input
              aria-label="Nome completo"
              autoComplete="name"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
            />
          )}
          {!recovery && (
            <Input
              aria-label="E-mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu e-mail"
            />
          )}
          <Input
            aria-label={recovery ? "Nova senha" : "Senha"}
            type="password"
            required
            minLength={recovery || register ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={recovery ? "Nova senha (mínimo 8 caracteres)" : "Senha"}
          />
          <Button disabled={busy} className="w-full">
            {recovery ? "Salvar nova senha" : register ? "Cadastrar usuário" : "Entrar"}
          </Button>
          {!recovery && !register && (
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
          {!recovery && (
            <button type="button" className="google-button" onClick={googleLogin} disabled={busy}>
              <GoogleIcon />
              Continuar com o Google
            </button>
          )}
          {!recovery && (
            <button type="button" className="install-app-button" onClick={installApp}>
              <img src="/favicon.png" alt="" aria-hidden="true" />
              <span>Baixe para seu celular a Netinho</span>
              <Download size={18} aria-hidden="true" />
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
      ) : !signedIn ? null : (
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
      )}
      <footer className="mx-auto mt-10 max-w-5xl border-t pt-5 text-center text-xs leading-6 text-muted-foreground">
        NETINHO AUTO PARTS · FCO Automotive & HD Embreagens
        <br />
        Peças, parceria e confiança em cada pedido.
      </footer>
    </main>
  );
}
