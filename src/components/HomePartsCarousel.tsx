import { useEffect, useState } from "react";
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
    if (paused || (typeof document !== "undefined" && document.hidden)) return;
    const id = window.setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % parts.length); }, 3200);
    return () => window.clearInterval(id);
  }, [paused]);
  // Carrega apenas o destaque e o próximo slide; as demais imagens entram sob demanda.
  return (
    <section className="home-cover-anchor relative mx-auto h-full w-full max-w-3xl overflow-hidden" aria-label="Peças em destaque" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}>

      <div className="relative h-full w-full overflow-hidden bg-[#061a36]">
        <img src={parts[index].image} alt={parts[index].title}
          className="block h-full w-full object-contain object-center"
          loading="eager" fetchPriority="high" decoding="async" />
      </div>
      <button type="button" aria-label="Imagem anterior" onClick={() => setIndex(i => (i - 1 + parts.length) % parts.length)} className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d8ad59] bg-[#09264bdc] text-white shadow-lg hover:bg-[#174b83]"><ChevronLeft size={22}/></button>
      <button type="button" aria-label="Próxima imagem" onClick={() => setIndex(i => (i + 1) % parts.length)} className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d8ad59] bg-[#09264bdc] text-white shadow-lg hover:bg-[#174b83]"><ChevronRight size={22}/></button>
      <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-[#071e3b99] px-2 py-1" aria-label="Selecionar imagem">
        {parts.map((part,i) => <button key={part.image} type="button" aria-label={`Mostrar imagem ${i+1}: ${part.title}`} aria-current={i===index ? "true" : undefined} onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i===index ? "w-5 bg-[#f3c75d]" : "w-2 bg-white/70 hover:bg-white"}`}/>)}
      </div>
    </section>
  );
}
