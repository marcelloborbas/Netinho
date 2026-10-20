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
    try {
const filename = brand === "FCO" ? "Catalogo_Completo_FCO.pdf" : "hd-catalogo.pdf";
      const response = await fetch(`/downloads/${encodeURIComponent(filename)}`, { cache: "no-store" });
      if (!response.ok || !(response.headers.get("content-type") ?? "").toLowerCase().includes("pdf")) {
        throw new Error("O catálogo PDF ainda não está disponível para download.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o catálogo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className={className + " transition-transform duration-200 hover:scale-110 active:scale-95 motion-reduce:transform-none"} disabled={busy} onMouseEnter={playSound} onClick={download} aria-label={`Baixar catálogo PDF ${name ?? brand}`} title={`Baixar catálogo PDF ${name ?? brand}`}>
      {iconOnly && image ? <img src={image} alt={name ?? brand} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : busy ? "Baixando..." : page ? `Baixar catálogo · pág. ${page}` : `Baixar PDF ${brand}`}
    </button>
  );
}
