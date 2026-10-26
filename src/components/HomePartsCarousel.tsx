import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

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
  return (
    <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[#d5e0ee] bg-white shadow-md" aria-label="Peças em destaque" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>

      <div className="flex items-center">
        <Link to="/catalogo" search={{ q: part.search }} className="flex min-w-0 flex-1 items-center justify-center">
          <img key={part.image} src={part.image} alt={part.title} className="aspect-square h-auto w-full object-contain" loading="lazy"/>

        </Link>
      </div>
    </section>
  );
}
