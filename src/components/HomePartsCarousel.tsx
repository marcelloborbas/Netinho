import { useEffect, useState } from "react";

const parts = [
  { title: "Bomba de direção hidráulica", image: "/images/carrossel/carrossel-1.webp", search: "bomba direção hidráulica" },
  { title: "Kit de embreagem FCO", image: "/images/carrossel/carrossel-2.webp", search: "embreagem" },
  { title: "Caixa de direção — sinais de desgaste", image: "/images/carrossel/carrossel-3.webp", search: "caixa direção" },
  { title: "Bobina de ignição", image: "/images/carrossel/carrossel-4.webp", search: "bobina ignição" },
  { title: "Rolamentos de embreagem", image: "/images/carrossel/carrossel-5.webp", search: "rolamento embreagem" },
  { title: "Peças automotivas FCO", image: "/images/carrossel/carrossel-6.webp", search: "FCO" },
  { title: "Linha de peças automotivas", image: "/images/carrossel/carrossel-7.webp", search: "FCO" },
  { title: "Novidades em peças automotivas", image: "/images/carrossel/carrossel-8.webp", search: "peças" },
  { title: "Promoções e novidades", image: "/images/carrossel/carrossel-9.webp", search: "peças" },
];

export function HomePartsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    if (paused || (typeof document !== "undefined" && document.hidden)) return;
    const id = window.setInterval(() => setIndex(i => i + 1), 3600);
    return () => window.clearInterval(id);
  }, [paused]);
  const select = (next: number) => {
    setAnimate(true);
    setIndex(next);
  };
  return (
    <section className="home-cover-anchor relative h-full w-full overflow-hidden bg-transparent" aria-label="Carrossel de peças em destaque"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>
      <div className="home-parts-track flex h-full w-full bg-transparent"
        style={{ transform: `translateX(-${index * 100}%)`, transition: animate ? "transform 650ms ease-in-out" : "none" }}
        onTransitionEnd={() => {
          if (index >= parts.length) {
            setAnimate(false);
            setIndex(0);
            requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
          }
        }}>
        {[...parts, parts[0]].map((part, i) =>
          <div key={i} className="home-parts-slide flex h-full min-w-full shrink-0 items-center justify-center bg-transparent">
            <img src={part.image} alt={part.title} decoding="async" loading={i <= 1 ? "eager" : "lazy"} className="block h-full w-full object-contain" />
          </div>
        )}
      </div>
      <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/65 px-2 py-1" aria-label="Selecionar imagem">
        {parts.map((part,i) => <button key={part.image} type="button" aria-label={`Mostrar imagem ${i+1}: ${part.title}`} aria-current={index % parts.length===i ? "true" : undefined} onClick={() => select(i)} className={`h-1.5 rounded-full transition-all ${index % parts.length===i ? "w-4 bg-[#d9a91c]" : "w-1.5 bg-[#61748c]"}`}/>)}
      </div>
    </section>
  );
}
