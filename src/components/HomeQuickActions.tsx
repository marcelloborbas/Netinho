import { Link } from "@tanstack/react-router";
import { ClipboardList, Search, ShoppingCart, Tags, MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";

const actions = [
  { label: "Novo pedido", description: "Monte um pedido para seu cliente", icon: ShoppingCart, to: "/vendas" as const, search: { modo: "venda" as const, q: "", promo: "" } },
  { label: "Consultar peças", description: "Pesquise no catálogo", icon: Search, to: "/catalogo" as const },
  { label: "Meus pedidos", description: "Acompanhe seus pedidos", icon: ClipboardList, to: "/pedidos" as const },
  { label: "Promoções", description: "Veja as ofertas disponíveis", icon: Tags, to: "/ofertas" as const },
];

export function HomeQuickActions() {
  return <section className="mx-3 space-y-2 sm:mx-6" aria-label="Acesso rápido">
    <div className="flex items-center justify-between px-1"><h2 className="text-base font-black text-[#102a52] sm:text-xl">Acesso rápido</h2><span className="text-xs font-bold text-[#a6790b]">Netinho Auto Parts</span></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {actions.map(({label,description,icon:Icon,to,...rest})=><Link key={label} to={to} {...("search" in rest?{search:rest.search}:{})} className="group flex min-h-[104px] min-w-0 items-center gap-3 rounded-2xl border-2 border-[#e2bc43] bg-gradient-to-br from-white to-[#eef4fc] p-3 text-[#102a52] shadow-[0_3px_0_#b88719,0_5px_12px_#12355d22] transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102a52]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#102a52] text-[#ffd43b]"><Icon size={23}/></span>
        <span className="min-w-0"><strong className="block text-sm font-black leading-tight">{label}</strong><small className="mt-1 block text-[10px] leading-tight text-[#526781]">{description}</small></span>
      </Link>)}
    </div>
  </section>;
}

export function HomeWhatsAppBanner() {
  const href = `https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent("Olá, Netinho Auto Parts! Preciso de ajuda para encontrar uma peça.")}`;
  return <section className="mx-3 sm:mx-6" aria-label="Atendimento pelo WhatsApp">
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-[#1b9b59] bg-gradient-to-r from-[#06264b] via-[#0b315c] to-[#063c37] p-3 text-white shadow-md transition hover:brightness-110">
      <span className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#20bd65]"><MessageCircle size={29}/></span><span className="min-w-0"><strong className="block text-sm font-black sm:text-base">Precisa de ajuda?</strong><small className="block text-xs text-blue-100">Nossa equipe atende você pelo WhatsApp</small></span></span>
      <span className="shrink-0 rounded-full bg-[#20bd65] px-3 py-2 text-xs font-black text-white">Fale conosco ›</span>
    </a>
  </section>;
}
