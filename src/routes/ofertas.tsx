import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, ShoppingCart, Tag, Home, Search, ClipboardList, Settings } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
export const Route = createFileRoute("/ofertas")({
  head: () => ({
    meta: [
      { title: "Ofertas de caixas de direção – NETINHO" },
      { name: "description", content: "Campanha FCO: caixas de direção com preço promocional em 30/45/60 dias." },
      { property: "og:title", content: "Ofertas de caixas de direção – NETINHO" },
      { property: "og:description", content: "Campanha FCO: caixas de direção com preço promocional em 30/45/60 dias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampaignOffers,
});
export type Offer = [string, string, number, number];
const campaignData = "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";
export async function readOffers(): Promise<Offer[]> {
  const bytes = Uint8Array.from(atob(campaignData), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return JSON.parse(await new Response(stream).text()) as Offer[];
}
const brl = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function CampaignOffers() {
  const [offers,setOffers] = useState<Offer[]>([]);
  const [error,setError] = useState(false);
  const [search,setSearch] = useState("");
  useEffect(()=>{readOffers().then(setOffers).catch(()=>setError(true));},[]);
  const filtered = offers.filter(([code,description])=>(code+" "+description).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <div className="min-h-screen bg-white pb-20 text-[#17263e]">
    <BrandHeader />
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex justify-center"><a href="#ofertas-campanha" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#174e9b] bg-[#eaf2ff] px-5 py-3 text-center font-extrabold text-[#102a52] shadow-sm transition hover:border-4 hover:bg-[#dbeafe] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#174e9b]"><Megaphone size={20}/> Campanha de Outubro · FCO</a></div>
      <h1 className="mb-2 text-3xl font-extrabold text-[#102a52]">Ofertas de caixas de direção</h1>
      <p className="mb-4 text-base text-[#475569]">Condições de pagamento: 30/45/60 dias</p>
      <input aria-label="Buscar oferta por código ou aplicação" placeholder="Buscar por código, veículo ou descrição..." value={search} onChange={e=>setSearch(e.target.value)} className="mb-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900" />
      {error && <p role="alert">Não foi possível carregar a relação de ofertas.</p>}
      {!error && offers.length===0 && <p>Carregando ofertas...</p>}
      <div id="ofertas-campanha" className="grid scroll-mt-5 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(([code,description,price,stock])=><article key={code} className="relative flex flex-col rounded-2xl border border-[#d5e1ee] bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-[#b91c1c] px-3 py-1 text-sm font-extrabold text-white"><Tag size={15}/> PROMOÇÃO FCO</span><Link to="/vendas" search={{ modo: "venda", promo: code }} aria-label={`Comprar peça ${code}`} className="inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-[#174e9b] bg-[#eaf2ff] px-3 py-1 text-sm font-extrabold text-[#102a52] hover:border-4 hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#174e9b]"><ShoppingCart size={16}/> Comprar</Link></div>
          <span className="text-base font-bold text-[#475569]">{code}</span>
          <h2 className="mt-2 flex-1 text-lg font-bold leading-relaxed text-[#102a52]">{description}</h2>
          <strong className="mt-4 text-3xl font-extrabold text-[#bd2026]">{brl.format(price)}</strong>
          <span className="mt-1 text-base font-semibold text-[#176a37]">Preço de campanha</span>
          <span className="mb-4 text-sm text-[#64748b]">30/45/60 dias · Estoque na tabela: {stock}</span>
        </article>)}
      </div>
      {offers.length>0 && filtered.length===0 && <p>Nenhuma oferta encontrada para esta busca.</p>}
    </main>
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-[#29476c] bg-[#061b3c] pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-4px_18px_rgba(0,0,0,0.14)] md:hidden">
      {([{to:"/",label:"Início",icon:Home},{to:"/catalogo",label:"Catálogo",icon:Search},{to:"/pedidos",label:"Pedidos",icon:ClipboardList},{to:"/admin",label:"Admin",icon:Settings}] as const).map(({to,label,icon:Icon}) => <Link key={to} to={to} className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold text-white transition hover:bg-[#174e9b] focus-visible:outline focus-visible:outline-4 focus-visible:outline-amber-400"><Icon size={21}/>{label}</Link>)}
    </nav>
  </div>;
}
