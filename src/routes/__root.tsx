import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center">
    <h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
    <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Voltar ao início</Link>
  </div></div>;
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center">
    <h1 className="text-2xl font-semibold text-foreground">Esta página não carregou</h1><p className="mt-2 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
    <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Tentar novamente</button>
  </div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1b1c1f" },
      { title: "Netinho Auto Parts" },
      { name: "description", content: "Catálogo e pedidos B2B da Netinho Auto Parts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter+Tight:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="pt-BR" className="dark"><head><HeadContent /></head><body>{children}<svg aria-hidden="true" className="absolute h-0 w-0"><defs><filter id="remove-white-background" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.2126 -0.7152 -0.0722 0 1" /></filter></defs></svg><Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    // Sons de interação para mouse e toque; hover só após o primeiro gesto
    // (navegadores não permitem áudio antes de interação do usuário).
    let audioContext: AudioContext | null = null;
    let lastControl: Element | null = null;
    let lastPlayed = 0;
    const getContext = () => {
      const AudioClass = window.AudioContext;
      if (!AudioClass) return null;
      audioContext ??= new AudioClass();
      if (audioContext.state !== "running") void audioContext.resume();
      return audioContext;
    };
    const play = (kind: "hover" | "click") => {
      try {
        const ctx = getContext();
        if (!ctx || ctx.state !== "running") return;
        const t = ctx.currentTime + 0.004;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(kind === "hover" ? 850 : 1050, t);
        osc.frequency.exponentialRampToValueAtTime(kind === "hover" ? 650 : 570, t + 0.1);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(kind === "hover" ? 0.11 : 0.14, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      } catch { /* Sem áudio, os controles continuam funcionando. */ }
    };
    const findControl = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return null;
      const control = target.closest("button, a, [role='button']");
      if (!control || control.hasAttribute("disabled") || control.getAttribute("aria-disabled") === "true") return null;
      return control;
    };
    const onHover = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const control = findControl(event);
      if (!control || control === lastControl) return;
      const now = performance.now();
      lastControl = control;
      if (now - lastPlayed < 110) return;
      lastPlayed = now;
      play("hover");
    };
    const onLeave = (event: PointerEvent) => {
      const related = event.relatedTarget;
      if (!(related instanceof Node) || !lastControl?.contains(related)) lastControl = null;
    };
    const onDown = (event: PointerEvent) => {
      if (!findControl(event)) return;
      play("click");
    };
    // Primeiro clique libera áudio para os próximos hovers, mesmo fora dos ícones.
    const unlock = () => { try { getContext(); } catch { /* opcional */ } };
    document.addEventListener("pointerover", onHover, true);
    document.addEventListener("pointerout", onLeave, true);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerdown", unlock, true);
    return () => {
      document.removeEventListener("pointerover", onHover, true);
      document.removeEventListener("pointerout", onLeave, true);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerdown", unlock, true);
      if (audioContext) void audioContext.close();
    };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event === "SIGNED_OUT") queryClient.clear(); else queryClient.invalidateQueries();
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return <QueryClientProvider client={queryClient}><Outlet /><Toaster richColors position="top-center" /></QueryClientProvider>;
}
