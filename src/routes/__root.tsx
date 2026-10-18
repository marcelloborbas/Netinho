import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { draftActions } from "@/lib/order-store";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

let softClickAudio: HTMLAudioElement | null = null;

function playSoftIconClick() {
  try {
    softClickAudio ??= new Audio("/sounds/soft-click.wav");
    softClickAudio.volume = 0.32;
    softClickAudio.currentTime = 0;
    void softClickAudio.play().catch(() => undefined);
  } catch {
    // Keep clicks silent when audio is unsupported or blocked by the browser.
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">Esta página não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
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
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter+Tight:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <svg aria-hidden="true" className="absolute h-0 w-0">
          <defs>
            <filter id="remove-white-background" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.2126 -0.7152 -0.0722 0 1"
              />
            </filter>
          </defs>
        </svg>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    softClickAudio ??= new Audio("/sounds/soft-click.wav");
    softClickAudio.preload = "auto";
    softClickAudio.load();
    let lastPointerSoundAt = 0;
    const findIconControl = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const control = target.closest("button, a, [role='button']");
      if (!control || control.matches(":disabled, [aria-disabled='true']")) return null;
      if (!control.querySelector("svg, img, [data-icon]")) return null;
      return control;
    };
    let hoveredIcon: Element | null = null;
    const playIconPointerOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const icon = target.closest("svg, img, [data-icon]");
      if (!icon || hoveredIcon === icon) return;
      const control = findIconControl(icon);
      if (!control) return;
      hoveredIcon = icon;
      playSoftIconClick();
    };
    const resetHoveredIcon = (event: PointerEvent) => {
      if (!hoveredIcon) return;
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && hoveredIcon.contains(nextTarget)) return;
      hoveredIcon = null;
    };
    const playIconPointerDown = (event: PointerEvent) => {
      const control = findIconControl(event.target);
      if (!control || event.button !== 0) return;
      lastPointerSoundAt = performance.now();
      playSoftIconClick();
    };
    const playIconClick = (event: MouseEvent) => {
      const control = findIconControl(event.target);
      if (!control) return;
      // Pointer clicks already played on pointerdown; preserve keyboard and assistive clicks.
      if (event.detail !== 0 && performance.now() - lastPointerSoundAt < 500) return;
      playSoftIconClick();
    };
    document.addEventListener("pointerover", playIconPointerOver, true);
    document.addEventListener("pointerout", resetHoveredIcon, true);
    document.addEventListener("pointerdown", playIconPointerDown, true);
    document.addEventListener("click", playIconClick, true);
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      draftActions.switchAccount(session?.user.id ?? null);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      queryClient.clear();
    });
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
    return () => {
      document.removeEventListener("pointerover", playIconPointerOver, true);
      document.removeEventListener("pointerout", resetHoveredIcon, true);
      document.removeEventListener("pointerdown", playIconPointerDown, true);
      document.removeEventListener("click", playIconClick, true);
      data.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
