import { useEffect, useState } from "react";

/** Acompanha o relógio real do áudio; timestamps por palavra são necessários para precisão absoluta. */
export function useLiaHighlight(text: string, speaking: boolean, audio: HTMLAudioElement | null, boundaryIndex: number | null) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!speaking) { setProgress(0); return; }
    const tick = () => {
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        setProgress(Math.max(0, Math.min(1, audio.currentTime / audio.duration)));
      }
    };
    tick();
    const timer = window.setInterval(tick, 60);
    audio?.addEventListener("timeupdate", tick);
    audio?.addEventListener("seeked", tick);
    return () => {
      window.clearInterval(timer);
      audio?.removeEventListener("timeupdate", tick);
      audio?.removeEventListener("seeked", tick);
    };
  }, [speaking, audio]);

  const parts = text.split(/(\s+)/);
  // Distribuição por extensão das frases, incluindo pausas entre parágrafos.
  const spokenLength = boundaryIndex !== null && !audio
    ? boundaryIndex
    : Math.floor(text.length * progress);
  let offset = 0;
  return parts.map((part, key) => {
    const start = offset;
    offset += part.length;
    const isWord = !!part.trim();
    return { text: part, highlighted: speaking && isWord && start <= spokenLength && spokenLength < offset, key };
  });
}
