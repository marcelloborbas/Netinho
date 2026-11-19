import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const parts = [
  {
    title: "Bomba de direção hidráulica",
    image: "/images/carrossel/carrossel-1.webp",
    search: "bomba direção hidráulica",
  },
  {
    title: "Kit de embreagem FCO",
    image: "/images/carrossel/carrossel-2.webp",
    search: "embreagem",
  },
  {
    title: "Caixa de direção — sinais de desgaste",
    image: "/images/carrossel/carrossel-3.webp",
    search: "caixa direção",
  },
  {
    title: "Bobina de ignição",
    image: "/images/carrossel/carrossel-4.webp",
    search: "bobina ignição",
  },
  {
    title: "Rolamentos de embreagem",
    image: "/images/carrossel/carrossel-5.webp",
    search: "rolamento embreagem",
  },
  { title: "Peças automotivas FCO", image: "/images/carrossel/carrossel-6.webp", search: "FCO" },
  {
    title: "Linha de peças automotivas",
    image: "/images/carrossel/carrossel-7.webp",
    search: "FCO",
  },
  {
    title: "Novidades em peças automotivas",
    image: "/images/carrossel/carrossel-8.webp",
    search: "peças",
  },
  { title: "Promoções e novidades", image: "/images/carrossel/carrossel-9.webp", search: "peças" },
];

export function HomePartsCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    if (paused || (typeof document !== "undefined" && document.hidden)) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), 3600);
    return () => window.clearInterval(id);
  }, [paused]);
  const select = (next: number) => {
    setAnimate(true);
    setIndex(next);
  };
  // Cópia do primeiro slide no fim permite o retorno contínuo ao início.
  const slides = parts.concat(parts.slice(0, 1));
  const active = index % parts.length;
  return (
    // Faixa de ponta a ponta: as margens negativas anulam o recuo lateral da página e a faixa
    // encosta nas duas bordas da tela. As imagens preenchem a faixa (object-cover), sem distorção.
    <section
      className={cn("flex min-h-0 min-w-0 flex-col gap-1 mx-[calc(50%-50vw)]", className)}
      aria-label="Carrossel de peças em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden border-y border-gold/60 bg-navy-deep shadow-home-card">
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: animate ? "transform 650ms ease-in-out" : "none",
          }}
          onTransitionEnd={() => {
            if (index >= parts.length) {
              setAnimate(false);
              setIndex(0);
              requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
            }
          }}
        >
          {slides.map((part, i) => (
            <div
              key={`${part.image}-${i}`}
              className="h-full min-w-full shrink-0"
              aria-hidden={i % parts.length !== active || i === parts.length}
            >
              <img
                src={part.image}
                alt={part.title}
                width={1201}
                height={676}
                decoding="async"
                loading={i <= 1 ? "eager" : "lazy"}
                className="block h-full w-full object-cover object-center"
              />
            </div>
          ))}
        </div>
      </div>
      {/* Indicadores abaixo da imagem, no fluxo normal, sem cobrir o banner. */}
      <div
        className="flex shrink-0 justify-center gap-1.5"
        role="group"
        aria-label="Selecionar imagem"
      >
        {parts.map((part, i) => (
          <button
            key={part.image}
            type="button"
            aria-label={`Mostrar imagem ${i + 1}: ${part.title}`}
            aria-current={active === i ? "true" : undefined}
            onClick={() => select(i)}
            className={`h-2 rounded-full transition-all ${active === i ? "w-5 bg-gold-deep" : "w-2 bg-navy/30"}`}
          />
        ))}
      </div>
    </section>
  );
}
