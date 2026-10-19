import { useEffect, useState } from "react";
import { Megaphone, ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const PROMOTIONS = [
  {
    "code": "FCZA-0001A",
    "title": "Caixa de Direção Mecânica",
    "application": "Gol 1980–2010 · Santana · Parati · Saveiro",
    "price": "R$ 247,20",
    "note": "Preço campanha · 30/45/60 dias",
    "image": "/images/campaign/vw-gol-caixa-direcao.webp",
    "searchTerm": "FCZA-0001A"
  },
  {
    "code": "FCZB-0005A",
    "title": "Caixa de Direção Mecânica",
    "application": "Fiat 147 · Elba · Fiorino · Uno · Prêmio",
    "price": "R$ 251,18",
    "note": "Preço campanha · 30/45/60 dias",
    "image": "/images/campaign/fiat-147-caixa-direcao.webp",
    "searchTerm": "FCZB-0005A"
  },
  {
    "code": "FCZF-0012A",
    "title": "Caixa de Direção Mecânica",
    "application": "Clio · Kangoo · Nissan Platina",
    "price": "R$ 257,24",
    "note": "Preço campanha · 30/45/60 dias",
    "image": "/images/campaign/novo-clio-kangoo.webp",
    "searchTerm": "FCZF-0012A"
  },
  {
    "code": "FCZI-0006A",
    "title": "Caixa de Direção Mecânica",
    "application": "Fiesta 1996–2006 · Courier 1996–2013",
    "price": "R$ 257,31",
    "note": "Preço campanha · 30/45/60 dias",
    "image": "/images/campaign/novo-fiesta-courier.webp",
    "searchTerm": "FCZI-0006A"
  },
  {
    "code": "FCZC-0005A",
    "title": "Caixa de Direção Mecânica",
    "application": "Corsa 1994–2002",
    "price": "R$ 262,02",
    "note": "Preço campanha · 30/45/60 dias",
    "image": null,
    "searchTerm": "FCZC-0005A"
  },
  {
    "code": "FCZB-0011A",
    "title": "Caixa de Direção Mecânica",
    "application": "Palio · Palio Weekend · Siena 1996–2000",
    "price": "R$ 263,64",
    "note": "Preço campanha · 30/45/60 dias",
    "image": "/images/campaign/novo-palio.webp",
    "searchTerm": "FCZB-0011A"
  },
  {
    "code": "FCZF-0019A",
    "title": "Caixa de Direção Mecânica",
    "application": "Clio 1990–1998",
    "price": "R$ 263,79",
    "note": "Preço campanha · 30/45/60 dias",
    "image": null,
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

      <div className="promotion-banner-art" key={promotion.code} style={{ display: "flex", alignItems: "center", justifyContent: "center", top: "50%", bottom: "auto", transform: "translateY(-50%)", background: "transparent", boxShadow: "none", border: "none", overflow: "visible" }}>
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
      <Link
        to="/catalogo"
        search={{ modo: "venda", q: promotion.searchTerm }}
        aria-label={`Comprar peça ${promotion.code}`}
        className="absolute z-20 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/30 bg-red-600 px-3 py-2 text-xs font-extrabold text-white shadow-lg transition-transform hover:scale-105"
        style={{ right: "clamp(10px, 3%, 22px)", top: "12px", width: "clamp(112px, 32%, 190px)" }}
      >
        <ShoppingCart size={16} aria-hidden="true" /> Comprar
      </Link>

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
