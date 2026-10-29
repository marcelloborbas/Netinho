import { useEffect, useState } from "react";

/**
 * Âncoras em segundos extraídas das pausas dos MP3s.
 * As palavras entre âncoras são interpoladas: aproximação, não alinhamento fonético.
 * Cada entrada corresponde ao início de um parágrafo do roteiro.
 */
const AUDIO_CUES: Record<string, { starts: number[]; end: number }> = {
  "lia-inicial.mp3": { starts: [0, 3.253, 10.312, 15.319, 19.706, 23.397], end: 26.172 },
  "lia-login.mp3": { starts: [0, 2.812, 5.382, 10.571, 15.956, 21.114], end: 25.721 },
  "lia-catalogo.mp3": { starts: [0, 4.315, 8.813, 13.260, 16.136, 23.123, 27.787, 33.296, 39.674, 41.771], end: 44.563 },
};

function activeOffset(text: string, audio: HTMLAudioElement, progress: number) {
  const filename = decodeURIComponent(audio.currentSrc || audio.src).split("?")[0].split("/").pop() ?? "";
  const cue = AUDIO_CUES[filename];
  if (!cue) return Math.floor(text.length * progress);
  const paragraphs = [...text.matchAll(/\S[^]*?(?=\n\s*\n|$)/g)];
  if (paragraphs.length !== cue.starts.length) return Math.floor(text.length * progress);
  const time = audio.currentTime;
  let index = 0;
  for (let i = 1; i < cue.starts.length; i++) if (time >= cue.starts[i]) index = i;
  const start = cue.starts[index];
  const end = cue.starts[index + 1] ?? cue.end;
  const paragraph = paragraphs[index];
  const ratio = Math.max(0, Math.min(0.999, (time - start) / Math.max(0.1, end - start)));
  // Distribuição por palavras dentro da frase, não por caracteres do áudio inteiro.
  const words = [...paragraph[0].matchAll(/\S+/g)];
  const word = words[Math.min(words.length - 1, Math.floor(words.length * ratio))];
  return (paragraph.index ?? 0) + (word?.index ?? 0);
}

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
  const spokenLength = boundaryIndex !== null && !audio
    ? boundaryIndex
    : audio && speaking ? activeOffset(text, audio, progress) : Math.floor(text.length * progress);
  let offset = 0;
  return parts.map((part, key) => {
    const start = offset;
    offset += part.length;
    return { text: part, highlighted: speaking && !!part.trim() && start <= spokenLength && spokenLength < offset, read: speaking && !!part.trim() && offset <= spokenLength, key };
  });
}
