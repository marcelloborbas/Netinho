import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const promotions = [
  {
    code: "FCZA-0001A",
    title: "Caixa de direção mecânica",
    application: "Gol · Santana · Parati · Saveiro",
    price: "R$ 247,20",
    note: "Preço atacado à vista da campanha",
  },
  {
    code: "FCZB-0005A",
    title: "Caixa de direção mecânica",
    application: "Fiat 147 · Elba · Fiorino · Uno · Prêmio",
    price: "R$ 251,18",
    note: "Preço atacado à vista da campanha",
  },
  {
    code: "FCZB-0020A",
    title: "Caixa de direção mecânica",
    application: "Elba · Fiorino · Prêmio · Uno Mille",
    price: "R$ 253,69",
    note: "Preço atacado à vista da campanha",
  },
] as const;

export function PromotionBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const promotion = promotions[active];

  function move(direction: number) {
    setActive((current) => (current + direction + promotions.length) % promotions.length);
  }

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % promotions.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="promotion-banner"
      aria-label="Promoções de caixas de direção FCO"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="promotion-banner-copy" aria-live="polite" aria-atomic="true">
        <div className="promotion-banner-label">
          <Sparkles size={14} aria-hidden="true" /> Campanha de outubro · FCO
        </div>
        <p className="promotion-banner-code">{promotion.code}</p>
        <h2>{promotion.title}</h2>
        <p className="promotion-banner-application">{promotion.application}</p>
        <div className="promotion-banner-price-row">
          <strong>{promotion.price}</strong>
          <span>{promotion.note}</span>
        </div>
        <Link
          className="promotion-banner-cta"
          to="/catalogo"
          search={{ marca: "FCO", modo: "consulta", q: promotion.code }}
          aria-label={`Consultar ${promotion.code} no catálogo FCO`}
        >
          Consultar promoção <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>

      <div className="promotion-banner-art" aria-hidden="true">
        <img src="/images/promo-caixa-direcao.svg" alt="" />
        <span>OFERTA FCO</span>
      </div>

      <div className="promotion-banner-controls" aria-label="Navegar pelas promoções">
        <button type="button" onClick={() => move(-1)} aria-label="Promoção anterior">
          <ChevronLeft size={18} />
        </button>
        <span aria-hidden="true">{active + 1} / {promotions.length}</span>
        <button type="button" onClick={() => move(1)} aria-label="Próxima promoção">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
