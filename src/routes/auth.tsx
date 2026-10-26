import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, LogOut, Monitor, Smartphone, Tablet, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery, saveProfile } from "@/lib/access";
import { greeting } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login | Netinho Auto Parts" },
      {
        name: "description",
        content: "Conheça FCO Automotive e HD Embreagens na Netinho Auto Parts.",
      },
      { property: "og:title", content: "Login | Netinho Auto Parts" },
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
  const [authCheckError, setAuthCheckError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [password, setPassword] = useState("");
  const [emailLoginOpen, setEmailLoginOpen] = useState(false);
  const [liaOpen, setLiaOpen] = useState(false);
  const [liaSpeaking, setLiaSpeaking] = useState(false);
  const liaText = "Olá! Seja muito bem-vindo!\n\nÉ uma imensa alegria em ter você conosco!\n\nEntre com sua conta do Google ou clique no envelope para receber seu link por e-mail.\n\nQuer praticidade? Baixe o atalho, aguarde a instalação e acesse pelo ícone na tela do seu celular.\n\nConte comigo para ajudar você em cada etapa!\n\nE não se esqueça:\n\nJesus te ama! Que Deus o abençoe em sua caminhada!";
  const liaAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio("/audio/lia/lia-login.mp3");
    audio.preload = "none";
    audio.onended = () => setLiaSpeaking(false);
    audio.onerror = () => { setLiaSpeaking(false); toast.error("Não foi possível reproduzir a fala da LIA."); };
    liaAudioRef.current = audio;
    return () => { audio.pause(); audio.onended = null; audio.onerror = null; liaAudioRef.current = null; };
  }, []);
  function toggleLiaSpeech() {
    const audio = liaAudioRef.current;
    if (!audio) return;
    if (liaSpeaking) { audio.pause(); audio.currentTime = 0; setLiaSpeaking(false); return; }
    audio.currentTime = 0;
    void audio.play().then(() => setLiaSpeaking(true)).catch(() => {
      setLiaSpeaking(false);
      toast.error("Toque novamente para ouvir a LIA.");
    });
  }
  const [emailAddress, setEmailAddress] = useState("");
  const [recovery, setRecovery] = useState(false);
  const showWelcome = !signedIn && !recovery;
  const { data: access, error, refetch, isPending } = useQuery({
    ...accessQuery,
    enabled: signedIn && !previewMode,
  });
  useEffect(() => {
    if (signedIn && access && !recovery && !previewMode) {
      saveProfile(access, access.can_sell ? "Representante Comercial" : "Visitante");
      // A entrada é confirmada pelo botão Continuar para minha área.
    }
  }, [signedIn, access, recovery, navigate, previewMode]);
  useEffect(() => {
    // Keep the preview shell mounted after OAuth, then show the signed-in app in its frame.
    let active = true;
    let sessionConfirmed = false;
    const timeout = window.setTimeout(() => {
      if (!active || sessionConfirmed) return;
      setChecking(false);
      setAuthCheckError(true);
    }, 12000);
    // getSession reads the persisted OAuth session without requiring a
    // potentially stalled remote getUser request on every page load.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      window.clearTimeout(timeout);
      sessionConfirmed = !!data.session?.user;
      setSignedIn(sessionConfirmed);
      setAuthCheckError(!!error && !sessionConfirmed);
      setChecking(false);
    }).catch(() => {
      if (!active || sessionConfirmed) return;
      window.clearTimeout(timeout);
      setAuthCheckError(true);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      sessionConfirmed = !!session?.user;
      if (sessionConfirmed) {
        window.clearTimeout(timeout);
        setAuthCheckError(false);
      }
      setSignedIn(sessionConfirmed);
      setChecking(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    if (window.location.hash.includes("error_description"))
      toast.error("O Google não concluiu o acesso. Tente novamente.");
    return () => { active = false; window.clearTimeout(timeout); data.subscription.unsubscribe(); };
  }, [previewMode, devicePreviewFrame]);
  function playLoginTap() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.17);
      osc.onended = () => void ctx.close();
    } catch { /* Browser may block sound. */ }
  }
  async function googleLogin() {
    playLoginTap();
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
  async function emailLogin(event: FormEvent) {
    event.preventDefault();
    const email = emailAddress.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth`, shouldCreateUser: true },
      });
      if (error) throw error;
      toast.success("Se a conta estiver habilitada, você receberá um link de acesso por e-mail.");
      setEmailLoginOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o link de acesso.");
    } finally {
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
    window.sessionStorage.removeItem("netinho-entry-approved");
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
    <main className={showWelcome ? "welcome-auth-stage" : "auth-stage min-h-screen bg-[#0b1f3f] px-4 py-6 text-white sm:py-10"}>
      {showWelcome && (
        <>
          <div className="welcome-art-frame">
            <img
              className="welcome-auth-art"
              src="/images/netinho-auth-nova.webp"
              alt="Seja bem-vindo ao mundo automotivo."
            />
            <section className="welcome-auth-actions" aria-label="Acesso temporário ao site">
              <style>{`
                @keyframes netinhoGooglePulse {
                  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255,255,255,.3)); }
                  50% { transform: scale(1.12); filter: drop-shadow(0 0 18px rgba(255,215,70,.9)); }
                }
                .netinho-google-icon { animation: netinhoGooglePulse 2s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) { .netinho-google-icon { animation: none; } }
              `}</style>
              
              <div className="mx-auto flex w-full max-w-xs items-center justify-between px-2 sm:px-3">
                <button type="button" className="netinho-google-icon flex h-20 w-20 items-center justify-center rounded-full bg-transparent p-1 transition-transform active:scale-90 disabled:opacity-60 sm:h-24 sm:w-24" disabled={busy} onClick={() => void googleLogin()} aria-label="Entrar com Google" title="Entrar com Google">
                  <img src="/images/google-login.svg" alt="" aria-hidden="true" className="h-full w-full object-contain" />
                </button>
                <button type="button" className="netinho-google-icon flex h-20 w-20 items-center justify-center rounded-full bg-transparent p-1 transition-transform active:scale-90 disabled:opacity-60 sm:h-24 sm:w-24" disabled={busy} onClick={() => setEmailLoginOpen((value) => !value)} aria-label="Entrar por e-mail" title="Entrar por e-mail">
                  <img src="/images/email-login.svg" alt="" aria-hidden="true" className="h-full w-full object-contain" />
                </button>
              </div>
              {emailLoginOpen && (
                <form onSubmit={(event) => void emailLogin(event)} className="mx-auto mt-3 flex w-full max-w-xs flex-col gap-2 rounded-xl bg-slate-950/85 p-3">
                  <label htmlFor="netinho-email-login" className="text-center text-xs font-semibold text-white">Receber link de acesso no e-mail</label>
                  <Input id="netinho-email-login" type="email" autoComplete="email" required value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="seuemail@exemplo.com" className="bg-white text-slate-950" />
                  <Button type="submit" disabled={busy}>{busy ? "Enviando..." : "Enviar link de acesso"}</Button>
                </form>
              )}
            </section>

          </div>
        </>
      )}
      {showWelcome && !previewMode && (
        <Link to="/" className="fixed left-3 top-[max(12px,env(safe-area-inset-top))] z-[110] rounded-full border border-white/40 bg-[#071c3d]/85 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-sm sm:text-sm" aria-label="Ir para a página inicial">
          Ir para Início
        </Link>
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
      {authCheckError && !signedIn && !checking && (
        <div className="mx-auto mt-6 max-w-md rounded-lg bg-white p-5 text-center text-slate-900">
          <p>Não foi possível confirmar o login do Google. Atualize a página e tente novamente.</p>
          <Button className="mt-3" onClick={() => window.location.assign("/auth")}>Tentar novamente</Button>
        </div>
      )}
      {!showWelcome && checking ? (
        <div className="flex justify-center p-24">
          <LoaderCircle className="animate-spin" aria-label="Verificando sessão" />
        </div>
      ) : !showWelcome && signedIn && !recovery ? (
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/20 bg-[#102a52] p-5 shadow-2xl sm:p-8">
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
            <div className="flex flex-col items-center gap-4 p-6 text-center" role="status">
              {isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              <h1 className="text-xl font-bold">Login do Google recebido</h1>
              <p>{isPending ? "Estamos verificando seu perfil. Aguarde um instante…" : "Não foi possível carregar seu perfil agora."}</p>
              <Button type="button" onClick={() => void refetch()}>Tentar novamente</Button>
              <button type="button" className="text-sm underline" onClick={logout}>Trocar conta</button>
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
                onClick={() => { window.sessionStorage.setItem("netinho-entry-approved", "1"); void navigate({ to: "/" }); }}
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
    </main>
  );
}
