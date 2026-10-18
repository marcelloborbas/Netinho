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
  return <img src="/images/google-logo.webp" width="30" height="30" alt="" aria-hidden="true" />;
}
function isDevicePreviewMode() {
  if (!import.meta.env.DEV) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("preview") === "device") return true;
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
  const [recovery, setRecovery] = useState(false);
  const showWelcome = !signedIn && !recovery;
  const { data: access, error, refetch, isPending } = useQuery({ ...accessQuery, enabled: signedIn });
  useEffect(() => {
    if (signedIn && access && !recovery) {
      saveProfile(access, access.can_sell ? "Representante Comercial" : "Visitante");
      void navigate({ to: "/" });
    }
  }, [signedIn, access, recovery, navigate]);
  useEffect(() => {
    // The preview shell must remain mounted through OAuth and keep its toolbar.
    if (previewMode) return;
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
  }, [previewMode]);
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
            <iframe title={`Prévia do site em ${device.label}`} src="/auth?devicePreviewFrame=1" />
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className={showWelcome ? "welcome-auth-stage" : "auth-stage min-h-screen px-4 py-6 sm:py-10"}>
      {showWelcome && (
        <>
          <header className="welcome-auth-brands">
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
            <section className="welcome-auth-actions" aria-label="Acesso à Netinho">
              <h1>Faça seu login</h1>
              <button
                type="button"
                className="welcome-google-button"
                onClick={googleLogin}
                disabled={busy}
                aria-busy={busy}
                aria-label="Continuar com o Google"
              >
                <GoogleIcon />
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
        <footer className="mx-auto mt-10 max-w-5xl border-t pt-5 text-center text-xs leading-6 text-muted-foreground">
          NETINHO AUTO PARTS · FCO Automotive & HD Embreagens
          <br />
          Peças, parceria e confiança em cada pedido.
        </footer>
      )}
    </main>
  );
}
