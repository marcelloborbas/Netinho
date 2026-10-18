import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";

const promotions = [
  {
    code: "FCZA-0001A",
    title: "Caixa de direção mecânica",
    application: "Gol · Santana · Parati · Saveiro",
    price: "R$ 247,20",
    note: "Preço atacado à vista da campanha",
    image:
      "https://images.tcdn.com.br/img/img_prod/940224/caixa_de_direcao_mecanica_volkswagen_gol_quadrado_1980_ate_1996_24997_2_21cd19e4cbc35ad99ac7a705ad15fcbf.png",
  },
  {
    code: "FCZB-0005A",
    title: "Caixa de direção mecânica",
    application: "Fiat 147 · Elba · Fiorino · Uno · Prêmio",
    price: "R$ 251,18",
    note: "Preço atacado à vista da campanha",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_614804-MLA89986012424_082025-O.webp",
  },
  {
    code: "FCZB-0020A",
    title: "Caixa de direção mecânica",
    application: "Elba · Fiorino · Prêmio · Uno Mille",
    price: "R$ 253,69",
    note: "Preço atacado à vista da campanha",
    image:
      "https://static.diskpecas.com.br/public/diskpecas/imagens/produtos/caixa-de-direcao-mecanica-elba-fiorino-premio-e-uno-93-97-ampri-23111-673df8679da5a.png",
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

      <div className="promotion-banner-art" key={promotion.code} aria-hidden="true">
        <img
          src={promotion.image}
          alt=""
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/images/promo-caixa-direcao.svg";
          }}
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
