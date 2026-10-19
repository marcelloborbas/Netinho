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
import { PartnerLogos } from "@/components/PartnerLogos";
import { Logo } from "@/components/Logo";
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
      void navigate({ to: "/" });
    }
  }, [signedIn, access, recovery, navigate, previewMode]);
  useEffect(() => {
    // Keep the preview shell mounted after OAuth, then show the signed-in app in its frame.
    if (devicePreviewFrame) return;
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
    void navigate({ to: "/" });
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
          <header className="app-header welcome-auth-brands">
            <Logo className="welcome-netinho-logo" />
            <div className="welcome-representations">
              <p>Representante Oficial</p>
              <PartnerLogos compact linked={false} />
            </div>
          </header>
          <div className="welcome-art-frame">
            <img
              className="welcome-auth-art"
              src="/images/welcome-screen-clean.webp"
              alt="Seja bem-vindo ao mundo automotivo."
            />
            <section className="welcome-auth-actions" aria-label="Login com Google">
              <p className="text-center text-sm font-bold text-white">Faça seu login a partir de sua conta do Google</p>
              <button type="button" className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-300/60 bg-white shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 motion-safe:animate-pulse" aria-label="Entrar com Google" onClick={() => { try { const AudioContextClass = window.AudioContext; if (AudioContextClass) { const ctx = new AudioContextClass(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); oscillator.type = "sine"; oscillator.frequency.value = 660; gain.gain.value = 0.035; oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.10); oscillator.onended = () => { void ctx.close(); }; } } catch { /* Audio may be unavailable */ } void googleLogin(); }} disabled={busy}>
                <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9c3.6 0 6.8 1.2 9.3 3.6l6.8-6.8C35.9 1.9 30.5 0 24 0 14.6 0 6.4 5.4 2.4 13.3l7.9 6.1C12.2 13.3 17.7 9 24 9Z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.2-3.2-.5-4.7H24v9.1h12.4c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 7.1-9.8 7.1-17.3Z"/><path fill="#FBBC05" d="M10.3 28.6a15 15 0 0 1 0-9.2l-7.9-6.1a24 24 0 0 0 0 21.4l7.9-6.1Z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-6.2l-7.3-5.7C30.6 37.5 27.7 39 24 39c-6.3 0-11.8-4.3-13.7-10.4l-7.9 6.1C6.4 42.6 14.6 48 24 48Z"/></svg>
              </button>
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
        <BrandFooter />
      )}
    </main>
  );
}
