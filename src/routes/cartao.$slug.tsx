import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";

const cards: Record<string, string> = {
  "abdnego-eugenio": "cartao-abdnego-eugenio.webp",
  "abdenego-eugenio": "cartao-abdnego-eugenio.webp",
  "domingos-rodrigues": "cartao-domingos-rodrigues.webp",
  "jhonatas-jose": "cartao-jhonatas-jose.webp",
  "jose-justino": "cartao-jose-justino.webp",
  "livaldo-silva": "cartao-livaldo-silva.webp",
  "luciano-da-silva": "cartao-luciano-da-silva.webp",
  "marcello-borba": "cartao-marcello-borba.webp",
  "marcello-borbas": "cartao-marcello-borba.webp",
  "marcello-borbas-sampaio": "cartao-marcello-borba.webp",
  "marcello-borba-sampaio": "cartao-marcello-borba.webp",
  "osmair-zanetti": "cartao-osmair-zanetti.webp",
  "romullo-sousa": "cartao-romullo-sousa.webp",
  "jose-burgato": "jose-burgato.webp",
};

export const Route = createFileRoute("/cartao/$slug")({
  component: PublicCard,
  staticData: { sitemap: false },
});

function PublicCard() {
  const { slug } = Route.useParams();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [slug]);
  const file = cards[slug];
  const image = file
    ? file === "jose-burgato.webp"
      ? "/images/fotos-representantes/jose-burgato.webp"
      : "/cartoes-digitais/" + encodeURIComponent(file)
    : null;

  return (
    <main className="min-h-screen bg-[#f1f1f1] px-3 py-6 text-[#102a52]">
      <section className="mx-auto max-w-lg overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-white shadow-lg">
        <header className="bg-[#102a52] px-4 py-4 text-center text-[#ffe19a]">
          <h1 className="text-xl font-black">CARTÃO DIGITAL</h1>
        </header>
        {!image || failed ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <ImageOff />
            <p>Cartão indisponível. Consulte a Netinho Auto Parts.</p>
          </div>
        ) : (
          <div className="p-3">
            <img
              key={image}
              src={image}
              alt="Cartão digital do representante Netinho Auto Parts"
              className="h-auto w-full rounded-lg object-contain"
              onError={() => setFailed(true)}
            />
          </div>
        )}
      </section>
    </main>
  );
}
