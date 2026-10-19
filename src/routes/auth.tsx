import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery, saveProfile } from "@/lib/access";
import { greeting } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallAppButton } from "@/components/InstallAppButton";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bem-vindo | Netinho Auto Parts" },
      {
        name: "description",
        content: "Conheça FCO Automotive e HD Embreagens na Netinho Auto Parts.",
      },
      { property: "og:title", content: "Bem-vindo | Netinho Auto Parts" },
      { property: "og:description", content: "Conheça FCO Automotive e HD Embreagens na Netinho Auto Parts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});
function isDevicePreviewMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") === "device" && window.self === window.top) return true;
  // Restore the preview after OAuth without changing the configured auth redirect URL.
  if (window.self !== window.top || window.sessionStorage.getItem("netinho-device-preview") !== "1") return false;
  window.sessionStorage.removeItem("netinho-device-preview");
  const restoredUrl = new URL(window.location.href);
  restoredUrl.searchParams.set("preview", "device");
  window.history.replaceState(window.history.state, "", restoredUrl);
  return true;
}
function AuthPage() {
  const previewMode = isDevicePreviewMode();
  const devicePreviewFrame = new URLSearchParams(window.location.search).get("devicePreviewFrame") === "1";
  const [previewDevice, setPreviewDevice] = useState<"phone" | "tablet" | "desktop">(() => {
    const saved = window.sessionStorage.getItem("netinho-preview-device");
    return saved === "phone" || saved === "tablet" || saved === "desktop" ? saved : "phone";
  });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [accessEmail, setAccessEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const showWelcome = !signedIn && !recovery;
  const { data: access, error, refetch, isPending } = useQuery({
    ...accessQuery,
    enabled: signedIn && !previewMode,
  });
  useEffect(() => {
    if (signedIn && access && !recovery && !previewMode) {
      saveProfile(access, access.can_sell ? "Representante Comercial" : "Visitante");
      void navigate({ to: access.level === 1 ? "/admin" : "/" });
    }
  }, [signedIn, access, recovery, navigate, previewMode]);
  useEffect(() => {
    // Keep the preview shell mounted after OAuth, then show the signed-in app in its frame.
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
  }, [previewMode, devicePreviewFrame]);
  async function sendAccessLink(event: FormEvent) {
    event.preventDefault();
    if (!accessEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: accessEmail.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/auth" },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar o link. Tente novamente.");
      return;
    }
    setLinkSent(true);
    toast.success("Enviamos um link de acesso. Abra seu e-mail e clique em Log In.");
  }
  async function emailLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar. Verifique e-mail e senha.");
      return;
    }
    setLoginPassword("");
    toast.success("Acesso identificado.");
    await qc.invalidateQueries({ queryKey: ["access"] });
    void navigate({ to: "/admin" });
  }
  async function recoverPassword() {
    if (!loginEmail.trim()) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) toast.error("Não foi possível enviar a recuperação.");
    else toast.success("Se o e-mail estiver cadastrado, você receberá as instruções.");
  }
  async function googleLogin() {
    // OAuth must leave the device-preview iframe before contacting Google.
    if (window.self !== window.top) {
      const isDevicePreviewFrame = new URLSearchParams(window.location.search).get("devicePreviewFrame") === "1";
      if (isDevicePreviewFrame) {
        setBusy(true);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth`,
            queryParams: { prompt: "select_account" },
            skipBrowserRedirect: true,
          },
        });
        if (error || !data.url) {
          toast.error(error?.message ?? "Não foi possível iniciar o acesso com Google.");
          setBusy(false);
          return;
        }
        window.top?.sessionStorage.setItem("netinho-device-preview", "1");
        window.top?.location.assign(data.url);
        return;
      }
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
  if (previewMode) {
    const device = {
      phone: { label: "Celular", width: 390, height: 844, icon: Smartphone },
      tablet: { label: "Tablet", width: 768, height: 1024, icon: Tablet },
      desktop: { label: "PC", width: 1440, height: 900, icon: Monitor },
    }[previewDevice];
    return (
      <main className="device-preview-shell">
        <nav className="device-preview-toolbar" aria-label="Tamanho da prévia">
          <strong>Visualização</strong>
          <div role="group" aria-label="Dispositivo">
            {(["phone", "tablet", "desktop"] as const).map((size) => {
              const option = {
                phone: { label: "Celular", icon: Smartphone },
                tablet: { label: "Tablet", icon: Tablet },
                desktop: { label: "PC", icon: Monitor },
              }[size];
              const Icon = option.icon;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={previewDevice === size}
                  onClick={() => {
                    setPreviewDevice(size);
                    window.sessionStorage.setItem("netinho-preview-device", size);
                  }}
                >
                  <Icon size={16} aria-hidden="true" /> {option.label}
                </button>
              );
            })}
          </div>
          <span>{device.width} × {device.height}</span>
        </nav>
        <section className="device-preview-workspace" aria-label={`Prévia em ${device.label}`}>
          <div
            className={`device-preview-frame device-preview-frame-${previewDevice}`}
            style={{ width: device.width, height: device.height }}
          >
            <iframe
              title={`Prévia do site em ${device.label}`}
              src={signedIn ? "/" : "/auth?devicePreviewFrame=1"}
            />
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className={showWelcome ? "welcome-auth-stage" : "auth-stage min-h-screen px-4 py-6 sm:py-10"}>
      {showWelcome && (
        <>
          <BrandHeader />
          <div className="welcome-art-frame">
            <img
              className="welcome-auth-art"
              src="/images/welcome-screen-clean.webp"
              alt="Seja bem-vindo ao mundo automotivo."
            />
            <section className="welcome-auth-actions" aria-label="Acesso temporário ao site">
              <p className="text-center text-sm font-bold text-white">Acesso livre para conhecer o projeto</p>
              <button type="button" className="welcome-google-button" onClick={() => navigate({ to: "/" })}>
                Entrar no Netinho
              </button>
              <div className="mx-auto mt-3 w-full max-w-xs rounded-xl bg-slate-950/90 p-3 text-white">
                <p className="mb-2 text-center text-sm font-bold">Ou acesse com seu e-mail</p>
                <form onSubmit={sendAccessLink} className="flex flex-col gap-2">
                  <Input type="email" aria-label="Seu e-mail" placeholder="Seu e-mail (Gmail, Outlook, Yahoo...)" autoComplete="email" value={accessEmail} disabled={busy} onChange={(event) => { setAccessEmail(event.target.value); setLinkSent(false); }} required />
                  <Button type="submit" disabled={busy}>{busy ? "Enviando..." : linkSent ? "Reenviar link de acesso" : "Receber link de acesso"}</Button>
                </form>
                {linkSent && <p role="status" className="mt-2 text-center text-sm font-semibold text-white">Confira sua caixa de entrada e o spam. Abra o e-mail do Netinho e clique em “Log In” para entrar. Você pode voltar a esta página depois.</p>}
                <p className="mt-2 text-center text-xs text-slate-200">Não é necessário ter conta Google. O acesso às funções depende do seu perfil.</p>
              </div>
              <button type="button" className="mt-2 text-xs font-semibold text-white underline" onClick={() => setShowLogin((value) => !value)}>
                {showLogin ? "Fechar acesso administrativo" : "Acesso administrativo"}
              </button>
              {showLogin && (
                <form onSubmit={emailLogin} className="mx-auto mt-2 flex w-full max-w-xs flex-col gap-2 rounded-lg bg-slate-950/90 p-3">
                  <Input type="email" aria-label="E-mail administrativo" placeholder="E-mail do administrador" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
                  <Input type="password" aria-label="Senha administrativa" placeholder="Senha" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
                  <Button type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar na administração"}</Button>
                </form>
              )}
            </section>
            <footer className="welcome-auth-footer" aria-label="Instalar o aplicativo Netinho">
              <InstallAppButton className="welcome-install-button" label="Baixe em seu celular" />
            </footer>
          </div>
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
            <div className="flex flex-col items-center gap-3 p-10 text-center" role="status">
              {isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              <p>{isPending ? "Verificando seu acesso…" : "Não foi possível carregar sua área."}</p>
            </div>
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
                <button onClick={logout} className="icon-button" aria-label="Trocar conta">
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
        <BrandFooter />
      )}
    </main>
  );
}
