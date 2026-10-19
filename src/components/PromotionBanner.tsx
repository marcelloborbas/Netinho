import { useEffect, useState } from "react";
import { Megaphone, ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const PROMOTIONS = [
  {
    "code": "FCZA-0001A",
    "title": "Caixa de Direção Mecânica",
    "application": "Gol 1980–2010 · Santana · Parati · Saveiro",
    "price": "R$ 247,20",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-setor-tf-direcao-mecanica-gol-quadrado-19801990.webp",
    "searchTerm": "FCZA-0001A"
  },
  {
    "code": "FCZB-0005A",
    "title": "Caixa de Direção Mecânica",
    "application": "Fiat 147 · Elba · Fiorino · Uno · Prêmio",
    "price": "R$ 251,18",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-direcao-fiat-147--spazio--panorama-nova-completa.webp",
    "searchTerm": "FCZB-0005A"
  },
  {
    "code": "FCZF-0012A",
    "title": "Caixa de Direção Mecânica",
    "application": "Clio · Kangoo · Nissan Platina",
    "price": "R$ 257,24",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-direcao-mecanica-renault-clio-kangoo-10-16-19992017.webp",
    "searchTerm": "FCZF-0012A"
  },
  {
    "code": "FCZI-0006A",
    "title": "Caixa de Direção Mecânica",
    "application": "Fiesta 1996–2006 · Courier 1996–2013",
    "price": "R$ 257,31",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-direcao-fiesta-97a02-courier-1996-97-98-99-00-01a-2013.webp",
    "searchTerm": "FCZI-0006A"
  },
  {
    "code": "FCZC-0005A",
    "title": "Caixa de Direção Mecânica",
    "application": "Corsa 1994–2002",
    "price": "R$ 262,02",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-direcao-corsa-wind-94-95-96-97-98-99-2000-mecanica.webp",
    "searchTerm": "FCZC-0005A"
  },
  {
    "code": "FCZB-0011A",
    "title": "Caixa de Direção Mecânica",
    "application": "Palio · Palio Weekend · Siena 1996–2000",
    "price": "R$ 263,64",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-direcao-palio-fire-2002-2003-2004-2005-2006-2007-2008.webp",
    "searchTerm": "FCZB-0011A"
  },
  {
    "code": "FCZF-0019A",
    "title": "Caixa de Direção Mecânica",
    "application": "Clio 1990–1998",
    "price": "R$ 263,79",
    "note": "Preço de Campanha",
    "image": "/images/campaign/Caixa-direcao-mecanica-renault-clio-kangoo-10-16-19992017.webp",
    "searchTerm": "FCZF-0019A"
  }
] as const;

export function PromotionBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const promotion = PROMOTIONS[active] ?? PROMOTIONS[0];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % PROMOTIONS.length);
    }, 3500);
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
        <Link to="/ofertas" aria-label="Abrir todos os itens promocionais da Campanha de outubro FCO" className="promotion-banner-label promotion-campaign-link">
          <span className="promotion-campaign-icon"><Megaphone size={18} aria-hidden="true" /></span>
          <span>Campanha de outubro · FCO</span>
          <img className="campaign-pointing-hand" src="data:image/webp;base64,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" alt="" aria-hidden="true" />
        </Link>
        <p className="promotion-banner-code">{promotion.code}</p>
        <h2 className="promotion-banner-title">{promotion.title}</h2>
        <p className="promotion-banner-application">{promotion.application}</p>
        <div className="promotion-banner-price-row" style={{ display: "inline-flex", flexDirection: "column", alignItems: "stretch", gap: 4, width: "max-content", maxWidth: "100%" }}>
          <strong className={promotion.price === "Sob consulta" ? "promotion-price-ask" : undefined}>
            {promotion.price}
          </strong>
          <span style={{ display: "block", width: "100%", fontSize: "clamp(12px, 1.7vw, 16px)", fontWeight: 800, letterSpacing: "0.025em", textAlign: "center", whiteSpace: "nowrap" }}>{promotion.note}<span style={{ display: "block", marginTop: 4, color: "#64748b", fontWeight: 700 }}>30/45/60 dias</span></span>
        </div>

      </div>

      <div className="promotion-banner-art" key={promotion.code} >
        {promotion.image ? (
          <>
            <img src={promotion.image} alt={promotion.title + " " + promotion.code} style={{ background: "transparent", objectFit: "contain" }} onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = "flex"; }} />
            <div style={{display:"none"}} className="h-full w-full flex-col items-center justify-center text-center text-amber-300"><span className="text-xs font-bold">Oferta FCO</span><span className="text-sm font-extrabold">{promotion.code}</span></div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#102a52] p-3 text-center text-amber-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">Oferta FCO</span>
            <span className="text-sm font-extrabold sm:text-lg">{promotion.code}</span>
          </div>
        )}
      </div>
    </section>
  );
}
