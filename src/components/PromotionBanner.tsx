import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Megaphone } from "lucide-react";

const promotions = [
  {
    code: "FCZA-0001A",
    title: "Caixa de direção mecânica",
    application: "Gol · Santana · Parati · Saveiro",
    price: "R$ 247,20",
    note: "Preço atacado à vista",
    image: "/images/campaign/vw-gol-caixa-direcao.webp",
    searchTerm: "FCZA-0001A",
  },
  {
    code: "FCZB-0005A",
    title: "Caixa de direção mecânica",
    application: "Fiat 147 · Elba · Fiorino · Uno · Prêmio",
    price: "R$ 251,18",
    note: "Preço atacado à vista",
    image: "/images/campaign/fiat-147-caixa-direcao.webp",
    searchTerm: "FCZB-0005A",
  },
  {
    code: "FCZB-0020A",
    title: "Caixa de direção mecânica",
    application: "Elba · Fiorino · Prêmio · Uno Mille",
    price: "R$ 253,69",
    note: "Preço atacado à vista",
    image: "/images/campaign/fiat-uno-caixa-direcao.webp",
    searchTerm: "FCZB-0020A",
  },
  {
    code: "FIAT STRADA",
    title: "Caixa de direção mecânica",
    application: "Fiat Strada · 2000–2013",
    price: "Sob consulta",
    note: "Preço atacado à vista",
    image: "/images/campaign/fiat-strada-caixa-direcao.webp",
    searchTerm: "Strada",
  },
] as const;

export function PromotionBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const promotion = promotions[active];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % promotions.length);
    }, 5000);
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
          <span className="promotion-campaign-icon"><Megaphone size={18} aria-hidden="true" /></span>
          <span>Campanha de outubro · FCO</span>
        </div>
        <p className="promotion-banner-code">{promotion.code}</p>
        <h2>{promotion.title}</h2>
        <p className="promotion-banner-application">{promotion.application}</p>
        <div className="promotion-banner-price-row">
          <strong className={promotion.price === "Sob consulta" ? "promotion-price-ask" : undefined}>
            {promotion.price}
          </strong>
          <span>{promotion.note}</span>
        </div>
        <Link
          className="promotion-banner-cta"
          to="/catalogo"
          search={{ marca: "FCO", modo: "consulta", q: promotion.searchTerm }}
          aria-label={`Consultar ${promotion.code} no catálogo FCO`}
        >
          Consultar promoção <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>

      <div className="promotion-banner-art" key={promotion.code} aria-hidden="true">
        <img
          src={promotion.image}
          alt=""
          onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
        />
        <span>IMAGEM ILUSTRATIVA</span>
      </div>

      <div
        className="promotion-banner-controls"
        role="status"
        aria-label={`Oferta ${active + 1} de ${promotions.length}`}
        data-paused={paused}
      >
        {promotions.map((item, index) => (
          <span
            key={item.code}
            className={index === active ? "is-active" : undefined}
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}
