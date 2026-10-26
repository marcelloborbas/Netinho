import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

const parts = [
  { code: "FCZA-0001A", title: "Caixa de Direção Mecânica", application: "Gol · Santana · Parati · Saveiro", image: "/images/campaign/Caixa-setor-tf-direcao-mecanica-gol-quadrado-19801990.webp" },
  { code: "FCZB-0005A", title: "Caixa de Direção Mecânica", application: "Fiat 147 · Elba · Fiorino · Uno", image: "/images/campaign/Caixa-direcao-fiat-147--spazio--panorama-nova-completa.webp" },
  { code: "FCZF-0012A", title: "Caixa de Direção Mecânica", application: "Clio · Kangoo · Nissan Platina", image: "/images/campaign/Caixa-direcao-mecanica-renault-clio-kangoo-10-16-19992017.webp" },
  { code: "FCZI-0006A", title: "Caixa de Direção Mecânica", application: "Fiesta · Courier", image: "/images/campaign/Caixa-direcao-fiesta-97a02-courier-1996-97-98-99-00-01a-2013.webp" },
  { code: "FCZC-0005A", title: "Caixa de Direção Mecânica", application: "Corsa", image: "/images/campaign/Caixa-direcao-corsa-wind-94-95-96-97-98-99-2000-mecanica.webp" },
  { code: "FCZB-0011A", title: "Caixa de Direção Mecânica", application: "Palio · Siena", image: "/images/campaign/Caixa-direcao-palio-fire-2002-2003-2004-2005-2006-2007-2008.webp" },
];

export function HomePartsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex(i => (i + 1) % parts.length), 4200);
    return () => window.clearInterval(id);
  }, [paused]);
  const part = parts[index];
  const move = (direction: number) => setIndex(i => (i + direction + parts.length) % parts.length);
  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[#d5e0ee] bg-white p-3 shadow-md sm:p-5" aria-label="Peças em destaque" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>
      <h2 className="mb-3 text-center text-lg font-black text-[#102a52] sm:text-xl">Peças em destaque</h2>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Peça anterior" className="shrink-0 rounded-full bg-[#102a52] p-2 text-white"><ChevronLeft size={20}/></button>
        <Link to="/catalogo" search={{ q: part.code }} className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl p-2 text-center transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
          <img key={part.code} src={part.image} alt={part.title + " " + part.code} className="h-36 w-full object-contain sm:h-56" loading="lazy"/>
          <span className="text-xs font-bold tracking-wider text-[#28517b]">{part.code}</span>
          <strong className="text-base font-black text-[#102a52] sm:text-xl">{part.title}</strong>
          <span className="text-xs text-slate-600 sm:text-sm">{part.application}</span>
          <span className="rounded-full bg-[#1262e8] px-4 py-2 text-xs font-bold text-white">Ver peça no catálogo</span>
        </Link>
        <button type="button" onClick={() => move(1)} aria-label="Próxima peça" className="shrink-0 rounded-full bg-[#102a52] p-2 text-white"><ChevronRight size={20}/></button>
      </div>
      <div className="mt-3 flex justify-center gap-2" aria-label="Escolher peça">
        {parts.map((p,i) => <button key={p.code} type="button" onClick={() => setIndex(i)} aria-label={`Mostrar peça ${i+1}`} aria-current={i===index ? "true" : undefined} className={`h-2.5 rounded-full transition-all ${i===index ? "w-7 bg-[#1262e8]" : "w-2.5 bg-slate-300"}`}/>)}
      </div>
    </section>
  );
}
