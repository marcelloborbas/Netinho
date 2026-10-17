import { PartnerLogos } from "@/components/PartnerLogos";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  PackageSearch,
  ClipboardList,
  Users,
  MessageCircle,
  ShieldCheck,
  ArrowUpRight,
  FileDown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { accessQuery, selectedProfile } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { greeting } from "@/components/ProfileAvatar";
import { BRAND } from "@/lib/brand";
import { partImage } from "@/lib/part-images";
import { RepresentativeDirectory } from "@/components/RepresentativeDirectory";
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const access = await context.queryClient.fetchQuery(accessQuery);
    if (!selectedProfile(access.email)) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Minha área | Netinho Auto Parts" }] }),
  component: Home,
});
function Home() {
  const { data: access } = useQuery(accessQuery);
  return (
    <div className="min-h-screen pb-10">
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <Link to="/auth" className="nav-link">
            Meu perfil <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">SUA CONEXÃO COM AS MELHORES PEÇAS</span>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              {greeting(`sr. ${access?.name.split(" ")[0] ?? ""}`)}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {access?.can_sell
                ? "Tudo pronto para o seu próximo bom negócio."
                : "Encontre a peça certa. Conte com quem entende."}
            </p>
          </div>
          <span className="access-badge">
            <ShieldCheck size={15} />
            Nível {access?.level ?? 3} ·{" "}
            {access?.can_sell ? "Área comercial" : "Catálogo de consulta"}
          </span>
        </div>
        <section className="catalog-hero relative overflow-hidden rounded-3xl border p-6 sm:p-10">
          <div className="relative z-10 max-w-xl">
            <span className="eyebrow">REPRESENTAÇÃO EXCLUSIVA · NETINHO</span>
            <h2 className="mt-4 text-4xl font-bold leading-[1.02] sm:text-6xl">
              Seu negócio merece
              <br />
              <span className="text-primary">a peça certa.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
              Tecnologia FCO Automotive e força HD Embreagens. Consulte aplicações e encontre
              soluções para cada veículo.
            </p>
            <Link to="/catalogo" className="primary-link mt-7">
              Explorar catálogo <ArrowRight size={18} />
            </Link>
            <div className="mt-8"><PartnerLogos /></div>
          </div>
          <img
            src={partImage("Kit Embreagem") || partImage("TBI") || undefined}
            alt="Linha de peças automotivas representada pela Netinho"
            className="pointer-events-none absolute -right-12 bottom-0 hidden h-[85%] w-[48%] object-contain opacity-80 lg:block"
          />
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: PackageSearch,
              title: "Catálogo de peças",
              text: "FCO, HD ou as duas marcas.",
              to: "/catalogo",
            },
            ...(access?.can_sell
              ? [
                  {
                    icon: Users,
                    title: "Meus clientes",
                    text: "Cadastros e atendimento organizados.",
                    to: "/clientes",
                  },
                  {
                    icon: ClipboardList,
                    title: "Meus pedidos",
                    text: "Acompanhe, repita e exporte em PDF.",
                    to: "/pedidos",
                  },
                ]
              : [
                  {
                    icon: MessageCircle,
                    title: "Falar com a Netinho",
                    text: "Encontre atendimento para sua região.",
                    to: "contact",
                  },
                  {
                    icon: FileDown,
                    title: "Catálogo HD em PDF",
                    text: "Consulte o catálogo original completo.",
                    to: "pdf",
                  },
                ]),
          ].map((item) => {
            const content = (
              <>
                <item.icon className="text-primary" size={24} />
                <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                <ArrowUpRight size={18} className="absolute right-5 top-5 text-muted-foreground" />
              </>
            );
            return item.to === "contact" ? (
              <a key={item.title} href="#representantes" className="action-card">
                {content}
              </a>
            ) : item.to === "pdf" ? (
              <a
                key={item.title}
                href="/catalog/hd-catalogo.pdf"
                target="_blank"
                rel="noreferrer"
                className="action-card"
              >
                {content}
              </a>
            ) : (
              <Link
                key={item.title}
                to={item.to as "/catalogo" | "/clientes" | "/pedidos"}
                className="action-card"
              >
                {content}
              </Link>
            );
          })}
        </section>
        <div className="mt-10">
          <RepresentativeDirectory />
        </div>
        <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-6 text-xs text-muted-foreground">
          <span>Netinho Auto Parts · FCO Automotive & HD Embreagens</span>
          <a href={`https://wa.me/${BRAND.phoneDigits}`} target="_blank" rel="noreferrer">
            {BRAND.phone}
          </a>
        </footer>
      </main>
    </div>
  );
}
