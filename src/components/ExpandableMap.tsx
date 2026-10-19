import { useEffect, useRef, useState } from "react";
import { Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = { src: string; alt: string; focus?: "sorocaba" | "vale" };

export function ExpandableMap({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "+" || event.key === "=") setZoom(z => Math.min(5, z + 0.5));
      if (event.key === "-") setZoom(z => Math.max(1, z - 0.5));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  function zoomAt(event: React.MouseEvent<HTMLImageElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setOrigin({ x, y });
    setZoom(z => z >= 4 ? 1 : z + 1);
  }
  return <>
    <button type="button" onClick={() => { setZoom(1); setOpen(true); }} className="relative block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-white text-left" aria-label="Abrir mapa para ampliar">
      {failed ? <span className="block p-6 text-center text-slate-800">Não foi possível carregar o mapa. Confira se o arquivo de imagem foi publicado.</span> : <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" onError={() => setFailed(true)} />}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-slate-900/85 px-3 py-2 text-xs font-bold text-white"><Maximize2 size={16}/> Ampliar mapa</span>
    </button>
    {open && <div role="dialog" aria-modal="true" aria-label="Mapa ampliado" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/90 p-3" onClick={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(false)} aria-label="Fechar mapa" className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-slate-900"><X size={24}/></button>
      <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-white" onClick={event => event.stopPropagation()}>
        <button type="button" aria-label="Diminuir zoom" onClick={() => setZoom(z => Math.max(1, z - 0.5))}><ZoomOut size={22}/></button>
        <span className="min-w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Aumentar zoom" onClick={() => setZoom(z => Math.min(5, z + 0.5))}><ZoomIn size={22}/></button>
        <button type="button" aria-label="Restaurar mapa" onClick={() => { setZoom(1); setOrigin({ x: 50, y: 50 }); }}><RotateCcw size={20}/></button>
      </div>
      <div className="relative flex h-[78vh] w-[95vw] max-w-6xl items-center justify-center overflow-hidden rounded-lg bg-white" onClick={event => event.stopPropagation()}>
        <img ref={imageRef} src={src} alt={alt} onClick={zoomAt} className="max-h-full max-w-full cursor-zoom-in object-contain transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: `${origin.x}% ${origin.y}%` }} />
      </div>
      <span className="text-center text-xs text-white/80">Toque ou clique em qualquer ponto do mapa para ampliar aquela área.</span>
    </div>}
  </>;
}
