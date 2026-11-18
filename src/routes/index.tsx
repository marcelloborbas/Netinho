import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { accessQuery } from "@/lib/access";
import { HomeRecentOrders, HomeSalesPanel } from "@/components/HomeCommercialDashboard";
import { HomePartsCarousel } from "@/components/HomePartsCarousel";
import { HomeQuickActions, HomeWhatsAppBanner } from "@/components/HomeQuickActions";
import { PublicFooter } from "@/components/PublicFooter";
import { pageHead } from "@/lib/page-head";
import { homeShareImage } from "@/lib/home-share-image";

export const Route = createFileRoute("/")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      ...pageHead("/", "Netinho Auto Parts | Catálogo de Peças e Representantes", "Netinho Auto Parts: consulte nosso catálogo de autopeças, faça pedidos e encontre um representante em sua região.").meta,
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
  const salutation = hour === null ? "Olá" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const periodBlessing = hour === null ? "Que seu dia seja abençoado!" : hour < 12 ? "Que sua manhã seja abençoada!" : hour < 18 ? "Que sua tarde seja abençoada!" : "Que sua noite seja abençoada!";
  // A sessão do Supabase, e não uma flag temporária da aba, determina o acesso.
  // PWAs iniciados pelo ícone podem abrir em uma nova sessão sem sessionStorage anterior.
  const [entryApproved, setEntryApproved] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("netinho-entry-approved") === "1");
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) void navigate({ to: "/auth", replace: true }); }, 10000);
    void supabase.auth.getSession().then(({ data }) => {
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
    }).catch(() => { if (active) { window.clearTimeout(timeout); void navigate({ to: "/auth", replace: true }); } });
    return () => { active = false; window.clearTimeout(timeout); };
  }, [navigate]);
  const { data: access } = useQuery({ ...accessQuery, enabled: entryApproved, retry: false });
  const previousLevel = useRef<string | null>(null);
  useEffect(() => {
    if (!access) return;
    const current = `${access.level}:${access.can_sell}`;
    if (previousLevel.current !== null && previousLevel.current !== current && (access.can_sell || access.level === 1)) toast.success("Seu acesso foi atualizado! Confira os perfis disponíveis.");
    previousLevel.current = current;
  }, [access]);
  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    let active = true;
    const readName = (user: { user_metadata?: Record<string, unknown>; email?: string } | null | undefined) => {
      if (!active) return;
      const meta = user?.user_metadata ?? {};
      const candidate = [meta["full_name"], meta["name"], meta["given_name"], meta["display_name"]]
        .find((value) => typeof value === "string" && value.trim());
      const emailName = user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "";
      setAccountName(String(candidate || emailName).trim());
    };
    if (entryApproved) void supabase.auth.getSession().then(({ data }) => readName(data.session?.user)).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      readName(session?.user);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [entryApproved]);
  const savedName = (() => {
    if (typeof window === "undefined") return "";
    try {
      const profile = JSON.parse(localStorage.getItem("netinho-vendedor") || "null");
      return typeof profile?.name === "string" ? profile.name.trim() : "";
    } catch { return ""; }
  })();
  const validName = (value: string) => {
    const first = value.split(/\s+/)[0]?.trim() || "";
    return first && !["usuário", "usuario", "visitante", "sr.", "sr"].includes(first.toLowerCase()) ? first : "";
  };
  const userName = validName(accountName) || validName(access?.name || "") || validName(savedName);
  // Alterna a cor do destaque a cada dia, sem depender de uma chamada externa.
  const dailyNameColors = ["#ffe083", "#7ee7ff", "#ffc1e3", "#b8ffb0", "#ffd0a1", "#d4c3ff", "#fff2a6"];
  const dailyNameColor = dailyNameColors[Math.floor(Date.now() / 86_400_000) % dailyNameColors.length];
  const status = access?.level === 1 || access?.attribution === "Administrador"
    ? "Administrador"
    : access?.attribution === "Representante" ? "Representante"
    : access?.attribution === "Vendedor" ? "Vendedor"
    : access?.can_sell ? "Vendedor" : "Visitante";
  if (!entryApproved) return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-navy-deep px-6 text-center text-navy-foreground"><img src="/images/Logo%20Netinho.webp" alt="Netinho Auto Parts" className="w-44 max-w-full" /><div role="status" aria-live="polite" className="flex flex-col items-center gap-4"><span className="h-11 w-11 animate-spin rounded-full border-4 border-gold/30 border-t-gold" aria-hidden="true"/><p className="text-base font-semibold">Carregando sua página inicial…</p></div><button type="button" onClick={() => void navigate({ to: "/auth", replace: true })} className="rounded-xl bg-gold px-5 py-3 font-bold text-gold-foreground">Ir para o login</button></main>;
  // Fluxo vertical único: cada bloco ocupa o próprio espaço, sem posicionamento sobreposto.
  // O espaço inferior reserva a altura da navegação fixa e da área segura do celular.
  return (
    <div className="netinho-home flex min-h-[100dvh] flex-col bg-background text-navy">
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-6 overflow-x-clip pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <header className="relative isolate overflow-hidden bg-navy-deep text-navy-foreground sm:mx-6 sm:mt-4 sm:rounded-3xl" aria-label="Boas-vindas">
          {/* A arte de fundo já contém a logo oficial; fica restrita ao próprio cabeçalho. */}
          <img src="/images/fundo-saudacao-novo.webp" alt="Netinho Auto Parts — estrada ao pôr do sol com caminhão e automóvel" width={2001} height={1071} className="absolute inset-0 -z-10 h-full w-full object-cover object-top" decoding="async" fetchPriority="high" />
          <div className="flex min-h-[200px] flex-col justify-end bg-gradient-to-t from-navy-deep via-navy-deep/30 to-transparent px-4 pb-5 pt-20 sm:min-h-[340px] sm:px-8 sm:pb-8">
            <div className="min-w-0 space-y-1">
              <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-bold leading-tight drop-shadow-lg">
                <span className="shrink-0 text-lg italic sm:text-3xl">{salutation} Sr.</span>
                <span className="min-w-0 max-w-full truncate text-3xl font-black leading-[1.05] animate-pulse motion-reduce:animate-none sm:text-6xl" style={{ color: dailyNameColor }} title={userName || "usuário"}>
                  {userName || "usuário"}!
                </span>
              </p>
              <p className="text-base font-bold italic drop-shadow-lg sm:text-2xl">{periodBlessing}</p>
            </div>
          </div>
        </header>
        <div className="flex flex-col gap-6 px-4 sm:px-6">
          <HomePartsCarousel />
          <HomeQuickActions />
          <HomeSalesPanel />
          <section className="space-y-3" aria-labelledby="home-brands-title">
            <h2 id="home-brands-title" className="text-lg font-black text-navy sm:text-xl">Encontre peças por montadora</h2>
            <ul className="grid grid-cols-4 gap-2 sm:gap-4">
              {(["volkswagen", "fiat", "chevrolet", "ford"] as const).map(brand => <li key={brand} className="min-w-0">
                <button type="button" onClick={() => void navigate({ to: "/catalogo", search: { q: brand } })} className="block w-full rounded-xl transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy" aria-label={`Ver peças da montadora ${brand}`}>
                  <img src={`/images/home-premium/montadora-${brand}.webp`} alt="" width={400} height={248} loading="lazy" className="block aspect-[400/248] h-auto w-full object-contain" />
                </button>
              </li>)}
            </ul>
          </section>
          <HomeRecentOrders />
          <HomeWhatsAppBanner />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
