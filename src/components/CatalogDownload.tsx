import { useState } from "react";
import { toast } from "sonner";
export function CatalogDownload({
  brand,
  page,
  className = "supplier-download",
  iconOnly = false,
  image,
  name,
}: {
  brand: "FCO" | "HD";
  page?: number;
  className?: string;
  iconOnly?: boolean;
  image?: string;
  name?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  function playSound() {
    try {
      const context = new window.AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
      oscillator.onended = () => { void context.close(); };
    } catch { /* O navegador pode bloquear áudio sem interação. */ }
  }
  async function download() {
    playSound();
    if (busy) return;
    setBusy(true);
    setProgress(null);
    const notification = toast.loading(`Preparando download do catálogo ${brand}...`, { duration: Infinity });
    try {
const filename = brand === "FCO" ? "Catalogo_Completo_FCO.pdf" : "hd-catalogo.pdf";
      const response = await fetch(`/downloads/${encodeURIComponent(filename)}`, { cache: "no-store" });
      if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("pdf")) {
        throw new Error("O catálogo PDF ainda não está disponível para download.");
      }
      const total = Number(response.headers.get("content-length") || 0);
      let blob: Blob;
      if (response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.byteLength;
          if (total > 0) {
            const percent = Math.min(100, Math.round(received / total * 100));
            setProgress(percent);
            toast.loading(`Baixando catálogo ${brand}: ${percent}%`, { id: notification, duration: Infinity });
          } else {
            toast.loading(`Baixando catálogo ${brand}... ${(received / 1024 / 1024).toFixed(1)} MB recebidos`, { id: notification, duration: Infinity });
          }
        }
        blob = new Blob(chunks as BlobPart[], { type: "application/pdf" });
      } else {
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success(`Catálogo ${brand} pronto! Verifique seus downloads.`, { id: notification, duration: 6000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o catálogo.", { id: notification, duration: 7000 });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  return (
    <>
      <button type="button" className={className + " transition-transform duration-200 hover:scale-110 active:scale-95 motion-reduce:transform-none"} disabled={busy} onMouseEnter={playSound} onClick={download} aria-label={`Baixar catálogo PDF ${name ?? brand}`} title={`Baixar catálogo PDF ${name ?? brand}`}>
        {iconOnly && image ? <img src={image} alt={name ?? brand} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : busy ? "Baixando..." : page ? `Baixar catálogo · pág. ${page}` : `Baixar PDF ${brand}`}
      </button>
      {busy && (
        <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-24 z-[9999] mx-auto max-w-sm rounded-2xl border-2 border-amber-300 bg-[#092044] p-4 text-center text-white shadow-2xl">
          <div className="mb-2 flex items-center justify-center gap-2 text-base font-extrabold">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-amber-400" aria-hidden="true" />
            Baixando catálogo {brand}
          </div>
          <p className="text-sm font-semibold">{progress === null ? "Preparando o arquivo. Aguarde..." : `${progress}% recebido. Aguarde...`}</p>
          {progress !== null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} /></div>}
          <p className="mt-2 text-xs text-white/80">Não feche esta página até o download começar.</p>
        </div>
      )}
    </>
  );
}
