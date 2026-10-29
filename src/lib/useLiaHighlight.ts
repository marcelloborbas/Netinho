import { useEffect, useState } from "react";

/** Approximate MP3 highlighting; exact word alignment requires timestamped captions. */
export function useLiaHighlight(text: string, speaking: boolean, audio: HTMLAudioElement | null, boundaryIndex: number | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!speaking) { setElapsed(0); return; }
    const tick = () => setElapsed(audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(1, audio.currentTime / audio.duration) : 0);
    tick();
    const timer = window.setInterval(tick, 90);
    return () => window.clearInterval(timer);
  }, [speaking, audio]);
  const words = text.split(/(\s+)/);
  const visibleLength = boundaryIndex !== null ? boundaryIndex : Math.floor(text.length * elapsed);
  let offset = 0;
  return words.map((part, i) => {
    const start = offset;
    offset += part.length;
    return { text: part, highlighted: speaking && start < visibleLength, key: i };
  });
}
