import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Building2, Handshake, PackageSearch, Truck } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { partImage } from "@/lib/part-images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Netinho Auto Parts | Representação e soluções automotivas" },
      { name: "description", content: "Conheça a Netinho Auto Parts, sua parceira em representação e soluções para o mercado automotivo." },
      { property: "og:title", content: "Netinho Auto Parts" },
      { property: "og:description", content: "Representação e soluções para o mercado automotivo." },
    ],
  }),
  component: HomePage,
});

const highlights = [
  { title: "Injeção eletrônica", text: "Soluções e componentes para aplicações automotivas.", image: partImage("Bicos de Injeção") },
  { title: "Atuadores", text: "Componentes para diferentes aplicações e sistemas.", image: partImage("Atuador Eletropneumático") },
  { title: "Linha automotiva", text: "Um catálogo pensado para quem trabalha com peças e aplicações.", image: partImage("TBI") },
];

const cases = [
  { icon: PackageSearch, title: "Seleção por aplicação", text: "Facilitamos a busca por código, referência e aplicação do veículo." },
  { icon: Handshake, title: "Atendimento B2B", text: "Uma experiência feita para relacionamento comercial e atendimento profissional." },
  { icon: Truck, title: "Distribuição", text: "Soluções para diferentes perfis do mercado automotivo e canais de venda." },
  { icon: BadgeCheck, title: "Foco em qualidade", text: "Informações organizadas para ajudar na identificação correta das peças." },
];

function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <Link to="/auth" className="rounded-xl bg-gradient-red px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]">
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.05fr_.95fr] md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Netinho Auto Parts
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] sm:text-5xl md:text-6xl">
              Conectando o mercado automotivo às peças certas.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              A Netinho Auto Parts atua com representação e soluções para o mercado automotivo,
              aproximando produtos, aplicações e oportunidades comerciais.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-red px-5 font-bold text-primary-foreground shadow-glow">
                Conhecer a Netinho <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#atuacao" className="inline-flex h-12 items-center rounded-xl border border-border bg-secondary/50 px-5 font-bold">
                Nossa atuação
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Mercado automotivo</span>
              <span className="flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" />Relacionamento B2B</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-8 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative surface-card flex min-h-[330px] items-center justify-center p-8">
              <LogoMark className="h-56 w-56 md:h-72 md:w-72" />
            </div>
          </div>
        </div>
      </section>

      <section id="atuacao" className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">O que fazemos</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Soluções para quem vive o automotivo.</h2>
            <p className="mt-3 text-muted-foreground">Uma apresentação clara das famílias e aplicações que fazem parte da nossa atuação.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="surface-card overflow-hidden">
                <div className="flex h-44 items-center justify-center bg-transparent p-5">
                  {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-contain image-transparent" /> : <PackageSearch className="h-16 w-16 text-primary" />}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Nossos casos</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Onde a Netinho ajuda a transformar atendimento em negócio.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Construímos uma experiência digital para apoiar a identificação de peças, o relacionamento comercial e a rotina de quem trabalha com o mercado automotivo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {cases.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-border bg-secondary/30 p-5">
                  <Icon className="h-7 w-7 text-primary" />
                  <h3 className="mt-4 font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-4 mb-12 overflow-hidden rounded-3xl bg-gradient-red shadow-glow sm:mx-auto sm:max-w-6xl">
        <div className="px-6 py-10 text-center sm:px-10">
          <h2 className="text-3xl font-black text-primary-foreground">Quer conhecer a Netinho?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/80">
            Identifique seu perfil para receber a experiência adequada ao seu acesso.
          </p>
          <Link to="/auth" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-slate-900">
            Continuar <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
        <Logo className="justify-center" />
        <p className="mt-4">Netinho Auto Parts · Representação e soluções para o mercado automotivo.</p>
      </footer>
    </main>
  );
}
