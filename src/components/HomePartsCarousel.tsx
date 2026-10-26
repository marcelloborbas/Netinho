import { useEffect, useState } from "react";

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
    const id = window.setInterval(() => setIndex(i => (i + 1) % parts.length), 2200);
    return () => window.clearInterval(id);
  }, [paused]);
  // Mantem todas as imagens carregadas para evitar tela vazia entre trocas.
  return (
    <section className="relative mx-auto w-full max-w-3xl" aria-label="Peças em destaque" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>

      <div className="w-full">
        <div className="w-full">
          <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
            {parts.map((part, i) => (
              <img key={part.image} src={part.image} alt={part.title}
                aria-hidden={i !== index}
                className={`absolute inset-0 block h-full w-full object-contain transition-opacity duration-300 ease-linear ${i === index ? "opacity-100" : "opacity-0"}`}
                loading="eager" decoding="async" />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
