import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { HomeSalesPanel } from "@/components/HomeCommercialDashboard";
import { HomePartsCarousel } from "@/components/HomePartsCarousel";
import { HomeWhatsAppButton } from "@/components/HomeWhatsAppButton";
import { PublicFooter } from "@/components/PublicFooter";
import { pageHead } from "@/lib/page-head";
import { homeShareImage } from "@/lib/home-share-image";

export const Route = createFileRoute("/")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      ...pageHead(
        "/",
        "Netinho Auto Parts | Catálogo de Peças e Representantes",
        "Netinho Auto Parts: consulte nosso catálogo de autopeças, faça pedidos e encontre um representante em sua região.",
      ).meta,
      { property: "og:image", content: homeShareImage.url },
      { property: "og:image:secure_url", content: homeShareImage.url },
      { property: "og:image:type", content: homeShareImage.type },
      { property: "og:image:width", content: homeShareImage.width },
      { property: "og:image:height", content: homeShareImage.height },
      { property: "og:image:alt", content: "Netinho Auto Parts" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: homeShareImage.url },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    const refreshGreeting = () => setHour(new Date().getHours());
    refreshGreeting();
    const timer = window.setInterval(refreshGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const salutation =
    hour === null ? "Olá" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const periodBlessing =
    hour === null
      ? "Que seu dia seja abençoado!"
      : hour < 12
        ? "Que sua manhã seja abençoada!"
        : hour < 18
          ? "Que sua tarde seja abençoada!"
          : "Que sua noite seja abençoada!";
  // A sessão do Supabase, e não uma flag temporária da aba, determina o acesso.
  // PWAs iniciados pelo ícone podem abrir em uma nova sessão sem sessionStorage anterior.
  const [entryApproved, setEntryApproved] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("netinho-entry-approved") === "1",
  );
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) void navigate({ to: "/auth", replace: true });
    }, 10000);
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        window.clearTimeout(timeout);
        if (data.session?.user) {
          window.sessionStorage.setItem("netinho-entry-approved", "1");
          setEntryApproved(true);
        } else {
          window.sessionStorage.removeItem("netinho-entry-approved");
          setEntryApproved(false);
          void navigate({ to: "/auth", replace: true });
        }
      })
      .catch(() => {
        if (active) {
          window.clearTimeout(timeout);
          void navigate({ to: "/auth", replace: true });
        }
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [navigate]);
  const { data: access } = useQuery({ ...accessQuery, enabled: entryApproved, retry: false });
  const previousLevel = useRef<string | null>(null);
  useEffect(() => {
    if (!access) return;
    const current = `${access.level}:${access.can_sell}`;
    if (
      previousLevel.current !== null &&
      previousLevel.current !== current &&
      (access.can_sell || access.level === 1)
    )
      toast.success("Seu acesso foi atualizado! Confira os perfis disponíveis.");
    previousLevel.current = current;
  }, [access]);
  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    let active = true;
    const readName = (
      user: { user_metadata?: Record<string, unknown>; email?: string } | null | undefined,
    ) => {
      if (!active) return;
      const meta = user?.user_metadata ?? {};
      const candidate = [
        meta["full_name"],
        meta["name"],
        meta["given_name"],
        meta["display_name"],
      ].find((value) => typeof value === "string" && value.trim());
      const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "";
      setAccountName(String(candidate || emailName).trim());
    };
    if (entryApproved)
      void supabase.auth
        .getSession()
        .then(({ data }) => readName(data.session?.user))
        .catch(() => {});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      readName(session?.user);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [entryApproved]);
  const savedName = (() => {
    if (typeof window === "undefined") return "";
    try {
      const profile = JSON.parse(localStorage.getItem("netinho-vendedor") || "null");
      return typeof profile?.name === "string" ? profile.name.trim() : "";
    } catch {
      return "";
    }
  })();
  const validName = (value: string) => {
    const first = value.split(/\s+/)[0]?.trim() || "";
    return first && !["usuário", "usuario", "visitante", "sr.", "sr"].includes(first.toLowerCase())
      ? first
      : "";
  };
  const userName = validName(accountName) || validName(access?.name || "") || validName(savedName);
  // Alterna a cor do destaque a cada dia, sem depender de uma chamada externa.
  const dailyNameColors = [
    "#ffe083",
    "#7ee7ff",
    "#ffc1e3",
    "#b8ffb0",
    "#ffd0a1",
    "#d4c3ff",
    "#fff2a6",
  ];
  const dailyNameColor =
    dailyNameColors[Math.floor(Date.now() / 86_400_000) % dailyNameColors.length];
  const status =
    access?.level === 1 || access?.attribution === "Administrador"
      ? "Administrador"
      : access?.attribution === "Representante"
        ? "Representante"
        : access?.attribution === "Vendedor"
          ? "Vendedor"
          : access?.can_sell
            ? "Vendedor"
            : "Visitante";
  if (!entryApproved)
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-navy-deep px-6 text-center text-navy-foreground">
        <img
          src="/images/Logo%20Netinho.webp"
          alt="Netinho Auto Parts"
          className="w-44 max-w-full"
        />
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
          <span
            className="h-11 w-11 animate-spin rounded-full border-4 border-gold/30 border-t-gold"
            aria-hidden="true"
          />
          <p className="text-base font-semibold">Carregando sua página inicial…</p>
        </div>
        <button
          type="button"
          onClick={() => void navigate({ to: "/auth", replace: true })}
          className="rounded-xl bg-gold px-5 py-3 font-bold text-gold-foreground"
        >
          Ir para o login
        </button>
      </main>
    );
  // Data por extenso para a saudação (rota sem SSR, sem risco de divergência na hidratação).
  const now = new Date();
  const longDate = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todayLabel = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const shortDate = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  // Tela única: grade com altura da tela (100dvh). Celular: uma coluna; banner e painel absorvem a
  // altura restante. Computador (lg): 12 colunas; saudação ampliada e indicadores no topo, banner de
  // ponta a ponta e, abaixo, painel de vendas/pedidos ao lado das montadoras. As linhas flexíveis têm
  // teto baixo (banner até 300px, painel até 380px) para não gerar blocos gigantes; em monitores
  // altos o conjunto é centralizado verticalmente. Em telas baixas demais, a altura volta a
  // ser automática e a página rola normalmente, sem sobrepor blocos nem encolher o texto.
  const brands = ["volkswagen", "fiat", "chevrolet", "ford"] as const;
  return (
    <div className="netinho-home netinho-home-refresh min-h-[100dvh] overflow-x-clip bg-background text-navy">
      <main className="netinho-home-refresh-grid mx-auto grid h-[100dvh] w-full max-w-[1100px] grid-cols-1 grid-rows-[minmax(140px,1.45fr)_minmax(140px,1fr)_minmax(130px,0.8fr)_min-content] gap-2 bg-transparent! px-4 pb-[calc(76px+env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] sm:gap-3 sm:px-6 [@media(max-height:740px)_and_(max-width:1023px)]:h-auto lg:max-w-[1280px] lg:grid-cols-12 lg:grid-rows-[minmax(140px,1.25fr)_minmax(170px,1fr)_minmax(170px,0.9fr)] lg:content-start lg:gap-3 lg:pt-3 2xl:max-w-[1440px] [@media(min-width:1024px)_and_(min-height:960px)]:content-center [@media(min-width:1024px)_and_(max-height:599px)]:h-auto">
        <header
          className="netinho-home-hero relative isolate w-full overflow-hidden rounded-2xl border border-gold/70 bg-navy-deep text-navy-foreground shadow-home-card lg:col-span-12"
          aria-label="Boas-vindas"
        >
          {/* Arte decorativa restrita ao próprio cabeçalho, sob uma camada azul-marinho. */}
          <img
            src="/images/fundo-saudacao-novo.webp"
            alt=""
            aria-hidden="true"
            width={2001}
            height={1071}
            className="netinho-hero-photo absolute inset-0 -z-10 h-full w-full object-cover object-center opacity-100"
            decoding="async"
            fetchPriority="high"
          />
          <div className="netinho-home-hero-content grid h-full min-h-[140px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-gradient-to-r from-navy-deep/85 via-navy-deep/20 to-transparent px-3 py-2.5 sm:gap-4 sm:px-5 lg:py-2">
            <div className="netinho-home-hero-copy min-w-0 leading-tight">
              <p className="truncate text-[11px] font-bold tracking-wide text-gold sm:text-xs">
                <span className="sm:hidden">{shortDate}</span>
                <span className="hidden sm:inline">{todayLabel}</span> · {status}
              </p>
              <p className="netinho-home-hero-greeting line-clamp-2 break-words font-display text-xl font-black leading-tight sm:truncate sm:text-3xl lg:text-[34px]">
                {salutation}, Sr.{" "}
                <span style={{ color: dailyNameColor }} title={userName || "usuário"}>
                  {userName || "usuário"}
                </span>
                !
              </p>
              <p className="netinho-home-hero-blessing truncate text-sm font-semibold italic text-navy-foreground/90 sm:text-base">
                {periodBlessing}
              </p>
            </div>
            <HomeWhatsAppButton />
          </div>
        </header>
        <HomePartsCarousel className="lg:col-span-12 [@media(max-height:740px)_and_(max-width:1023px)]:h-[210px]" />
        <HomeSalesPanel className="netinho-home-sales lg:col-span-8 [@media(max-height:740px)_and_(max-width:1023px)]:h-[230px]" />
        <section
          className="netinho-home-brands min-w-0 lg:col-span-4"
          aria-label="Montadoras"
        >
          <ul className="grid h-full grid-cols-4 items-center gap-1 sm:gap-2">
            {brands.map((brand) => (
              <li key={brand} className="min-w-0">
                <div className="grid w-full place-items-center" aria-label={`Montadora ${brand}`}>
                  <img
                    src={`/images/home-premium/montadora-${brand}.webp`}
                    alt=""
                    width={400}
                    height={248}
                    loading="lazy"
                    className="netinho-brand-image block h-[58px] w-auto max-w-full object-contain sm:h-[67px] xl:h-[77px]"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
