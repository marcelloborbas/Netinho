import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

type Props = { src: string; alt: string };

export function ExpandableMap({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="relative block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-white text-left" aria-label="Ampliar mapa">
      {failed ? <span className="block p-6 text-center text-slate-800">Não foi possível carregar o mapa. Confira se o arquivo de imagem foi publicado.</span> : <img src={src} alt={alt} className="block h-auto w-full" loading="lazy" onError={() => setFailed(true)} />}
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-slate-900/85 px-3 py-2 text-xs font-bold text-white"><Maximize2 size={16}/> Ampliar mapa</span>
    </button>
    {open && <div role="dialog" aria-modal="true" aria-label="Mapa ampliado" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3" onClick={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(false)} aria-label="Fechar mapa ampliado" className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-slate-900"><X size={24}/></button>
      <img src={src} alt={alt} className="max-h-[92vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
    </div>}
  </>;
}
