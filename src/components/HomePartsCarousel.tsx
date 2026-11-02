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
  useEffect(() => {
    if (paused || (typeof document !== "undefined" && document.hidden)) return;
    const id = window.setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % parts.length); }, 3200);
    return () => window.clearInterval(id);
  }, [paused]);
  // Antecipar apenas a próxima imagem evita atraso visual sem baixar as nove de uma vez.
  useEffect(() => {
    const next = parts[(index + 1) % parts.length];
    const image = new Image();
    image.decoding = "async";
    image.src = next.image;
  }, [index]);
  return (
    <section className="home-cover-anchor relative mx-auto h-full w-full max-w-3xl overflow-hidden" aria-label="Peças em destaque" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>

      <div className="relative h-full w-full overflow-hidden bg-[#061a36]">
        <img src={parts[index].image} alt={parts[index].title} decoding="async" fetchPriority={index === 0 ? "high" : "auto"} className="block h-full w-full object-contain object-center" />
      </div>
      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-[#071e3b99] px-2 py-1" aria-label="Selecionar imagem">
        {parts.map((part,i) => <button key={part.image} type="button" aria-label={`Mostrar imagem ${i+1}: ${part.title}`} aria-current={i===index ? "true" : undefined} onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i===index ? "w-5 bg-[#f3c75d]" : "w-2 bg-white/70 hover:bg-white"}`}/>)}
      </div>
    </section>
  );
}
