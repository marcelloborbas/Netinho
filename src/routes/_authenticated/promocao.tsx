import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, BadgePercent, CircleHelp, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROMOTIONS } from "@/components/PromotionBanner";

export const Route = createFileRoute("/_authenticated/promocao")({
  validateSearch: (search: Record<string, unknown>): { codigo?: string } => ({
    codigo: typeof search.codigo === "string" ? search.codigo.slice(0, 50) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Consultar promoção | Netinho Auto Parts" },
      { name: "description", content: "Confira a oferta da campanha e consulte a peça no catálogo." },
    ],
  }),
  component: PromotionPage,
});

function PromotionPage() {
  const { codigo } = Route.useSearch();
  const promotion = PROMOTIONS.find((item) => item.code === codigo);

  if (!promotion) {
    return (
      <section className="surface-card mx-auto max-w-2xl space-y-4 p-6 text-center sm:p-10">
        <CircleHelp className="mx-auto text-primary" size={38} aria-hidden="true" />
        <h1 className="text-2xl font-bold">Promoção não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Essa oferta não está disponível. Volte ao início para ver as campanhas atuais.
        </p>
        <Button asChild className="bg-gradient-red">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </section>
    );
  }

  const askPrice = promotion.price === "Sob consulta";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar ao início
      </Link>

      <article className="surface-card overflow-hidden">
        <div className="grid md:grid-cols-[1fr_1fr]">
          <div className="promotion-detail-art relative flex min-h-[260px] items-center justify-center overflow-hidden p-5 sm:min-h-[390px]">
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-200">
              <BadgePercent size={16} aria-hidden="true" /> Campanha FCO
            </div>
            <img
              src={promotion.image}
              alt={`${promotion.title} — ${promotion.application}`}
              className="relative z-10 max-h-[330px] w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,.4)] sm:max-h-[410px]"
            />
          </div>

          <div className="flex flex-col justify-center gap-5 p-5 sm:p-9">
            <div>
              <p className="eyebrow">OFERTA DA CAMPANHA</p>
              <p className="mt-2 text-sm font-semibold tracking-wide text-primary">{promotion.code}</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                {promotion.title}
              </h1>
              <p className="mt-3 text-base text-muted-foreground">{promotion.application}</p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {askPrice ? "Valor" : "Preço promocional"}
                  </p>
                  <p className={`mt-1 font-display text-3xl font-extrabold ${askPrice ? "text-amber-200" : "text-primary"}`}>
                    {promotion.price}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-lg bg-lime-400/10 px-3 py-2 text-xs font-bold text-lime-300">
                  <Tag size={15} aria-hidden="true" /> {promotion.note}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Consulte disponibilidade e confirme a condição com a equipe comercial antes de fechar o pedido.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="h-12 bg-gradient-red font-bold">
                <Link
                  to="/catalogo"
                  search={{ marca: "FCO", modo: "consulta", q: promotion.searchTerm }}
                >
                  Consultar no catálogo <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12">
                <Link to="/catalogo" search={{ marca: "FCO", modo: "venda", q: promotion.searchTerm }}>
                  Montar venda
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
