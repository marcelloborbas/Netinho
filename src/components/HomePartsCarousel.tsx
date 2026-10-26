import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

const parts = [
  { title: "Bomba de direção hidráulica", image: "/images/carrossel/carrossel-1.webp", search: "bomba direção hidráulica" },
  { title: "Kit de embreagem FCO", image: "/images/carrossel/carrossel-2.webp", search: "embreagem" },
  { title: "Caixa de direção — sinais de desgaste", image: "/images/carrossel/carrossel-3.webp", search: "caixa direção" },
  { title: "Bobina de ignição", image: "/images/carrossel/carrossel-4.webp", search: "bobina ignição" },
  { title: "Rolamentos de embreagem", image: "/images/carrossel/carrossel-5.webp", search: "rolamento embreagem" },
  { title: "Peças automotivas FCO", image: "/images/carrossel/carrossel-6.webp", search: "FCO" },
  { title: "Linha de peças automotivas", image: "/images/carrossel/carrossel-7.webp", search: "FCO" },
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
        <Link to="/catalogo" search={{ q: part.search }} className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl p-2 text-center transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
          <img key={part.image} src={part.image} alt={part.title} className="aspect-square h-auto max-h-[580px] w-full object-contain" loading="lazy"/>
          <span className="rounded-full bg-[#1262e8] px-4 py-2 text-xs font-bold text-white">Ver peça no catálogo</span>
        </Link>
        <button type="button" onClick={() => move(1)} aria-label="Próxima peça" className="shrink-0 rounded-full bg-[#102a52] p-2 text-white"><ChevronRight size={20}/></button>
      </div>
      <div className="mt-3 flex justify-center gap-2" aria-label="Escolher peça">
        {parts.map((p,i) => <button key={p.image} type="button" onClick={() => setIndex(i)} aria-label={`Mostrar peça ${i+1}`} aria-current={i===index ? "true" : undefined} className={`h-2.5 rounded-full transition-all ${i===index ? "w-7 bg-[#1262e8]" : "w-2.5 bg-slate-300"}`}/>)}
      </div>
    </section>
  );
}
