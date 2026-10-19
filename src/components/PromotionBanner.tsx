import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

export const PROMOTIONS = [
  {
    code: "FCZA-0001A",
    title: "Caixa de Direção Mecânica",
    application: "Gol · Santana · Parati · Saveiro",
    price: "R$ 247,20",
    note: "Preço Atacado à vista",
    image: "/images/campaign/vw-gol-caixa-direcao.webp",
    searchTerm: "FCZA-0001A",
  },
  {
    code: "FCZB-0005A",
    title: "Caixa de Direção Mecânica",
    application: "Fiat 147 · Elba · Fiorino · Uno · Prêmio",
    price: "R$ 251,18",
    note: "Preço Atacado à vista",
    image: "/images/campaign/fiat-147-caixa-direcao.webp",
    searchTerm: "FCZB-0005A",
  },
  {
    code: "FCZB-0020A",
    title: "Caixa de Direção Mecânica",
    application: "Elba · Fiorino · Prêmio · Uno Mille",
    price: "R$ 253,69",
    note: "Preço Atacado à vista",
    image: "/images/campaign/fiat-uno-caixa-direcao.webp",
    searchTerm: "FCZB-0020A",
  },
  {
    code: "FIAT STRADA",
    title: "Caixa de Direção Mecânica",
    application: "Fiat Strada · 1996–2000",
    price: "Sob consulta",
    note: "Preço Atacado à vista",
    image: "/images/campaign/fiat-strada-caixa-direcao.webp",
    searchTerm: "Strada",
  },
] as const;

export function PromotionBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const promotion = PROMOTIONS[active] ?? PROMOTIONS[0];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % PROMOTIONS.length);
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
        <h2 style={{ maxWidth: "54%", lineHeight: 1.08 }}><span style={{ display: "block", whiteSpace: "nowrap" }}>Caixa de Direção</span><span style={{ display: "block" }}>Mecânica</span></h2>
        <p className="promotion-banner-application">{promotion.application}</p>
        <div className="promotion-banner-price-row" style={{ display: "inline-flex", flexDirection: "column", alignItems: "stretch", gap: 4, width: "max-content", maxWidth: "100%" }}>
          <strong className={promotion.price === "Sob consulta" ? "promotion-price-ask" : undefined}>
            {promotion.price}
          </strong>
          <span style={{ display: "block", width: "100%", fontSize: "clamp(12px, 1.7vw, 16px)", fontWeight: 800, letterSpacing: "0.025em", textAlign: "center", whiteSpace: "nowrap" }}>{promotion.note}</span>
        </div>

      </div>

      <div className="promotion-banner-art" key={promotion.code} style={{ display: "flex", alignItems: "center", justifyContent: "center", top: "50%", bottom: "auto", transform: "translateY(-50%)" }} aria-hidden="true">
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
        aria-label={`Oferta ${active + 1} de ${PROMOTIONS.length}`}
        data-paused={paused}
      >
        {PROMOTIONS.map((item, index) => (
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
