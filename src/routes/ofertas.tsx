import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { PROMOTIONS } from "@/components/PromotionBanner";

export const Route = createFileRoute("/ofertas")({
  component: CampaignOffers,
});

function CampaignOffers() {
  return (
    <div className="min-h-screen bg-white pb-20 text-[#17263e]">
      <BrandHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-semibold text-[#1552a0]"><ArrowLeft size={18} /> Voltar ao início</Link>
        <p className="text-sm font-bold uppercase tracking-wider text-[#a24c17]">Campanha de outubro · FCO</p>
        <h1 className="mb-2 text-3xl font-extrabold text-[#102a52]">Ofertas de caixas de direção</h1>
        <p className="mb-8 text-[#64748b]">Condições de pagamento: 30/45/60 dias.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROMOTIONS.map((offer) => (
            <article key={offer.code} className="flex flex-col overflow-hidden rounded-2xl border border-[#d5e1ee] bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-40 items-center justify-center rounded-xl bg-[#f8fbff]">
                {offer.image ? <img src={offer.image} alt={offer.title + " " + offer.code} className="h-full w-full object-contain" /> : <span className="text-sm font-semibold text-[#64748b]">Imagem não disponível</span>}
              </div>
              <span className="text-xs font-bold text-[#64748b]">{offer.code}</span>
              <h2 className="mt-1 text-lg font-extrabold text-[#102a52]">{offer.title}</h2>
              <p className="mt-2 flex-1 text-sm text-[#475569]">{offer.application}</p>
              <strong className="mt-4 text-2xl text-[#bd2026]">{offer.price}</strong>
              <span className="text-sm font-semibold text-[#176a37]">Preço de Campanha</span>
              <span className="mb-4 text-sm text-[#64748b]">30/45/60 dias</span>
              <Link to="/catalogo" search={{ modo: "venda", q: offer.searchTerm }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b91c1c] px-4 py-3 font-bold text-white hover:bg-[#991b1b]"><ShoppingCart size={18} /> Ver peça</Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
