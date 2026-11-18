import { Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, MessageCircle, Search, ShoppingCart, Tag, type LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { HOME_ICON_SIZE, HOME_ICON_STROKE, HomeIconTile } from "@/components/HomeIconTile";

/** Classe única dos cartões: mesma altura, borda dourada e foco visível. */
const cardClass =
  "group flex h-full min-h-[96px] min-w-0 flex-col gap-2 rounded-2xl border border-gold/70 bg-card p-3 text-navy shadow-home-card transition-colors hover:border-gold hover:bg-gold-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy sm:flex-row sm:items-center sm:gap-3";

interface QuickActionCopyProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

function QuickActionCopy({ icon, title, description }: QuickActionCopyProps) {
  return (
    <>
      <HomeIconTile icon={icon} />
      <span className="min-w-0">
        <strong className="block text-sm font-black leading-tight sm:text-base">{title}</strong>
        <small className="mt-1 block text-xs leading-snug text-muted-foreground">{description}</small>
      </span>
    </>
  );
}

/** Quatro atalhos completos, em grade 2×2 no celular e 4 colunas no computador. */
export function HomeQuickActions() {
  return (
    <section className="space-y-3" aria-labelledby="home-quick-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-quick-title" className="text-lg font-black text-navy sm:text-xl">Acesso rápido</h2>
        <span className="truncate text-xs font-bold text-gold-deep">Netinho Auto Parts</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li className="min-w-0">
          <Link to="/vendas" search={{ modo: "venda", q: "", promo: "" }} className={cardClass}>
            <QuickActionCopy icon={ShoppingCart} title="Novo pedido" description="Monte um pedido para seu cliente" />
          </Link>
        </li>
        <li className="min-w-0">
          <Link to="/catalogo" className={cardClass}>
            <QuickActionCopy icon={Search} title="Consultar peças" description="Pesquise no catálogo" />
          </Link>
        </li>
        <li className="min-w-0">
          <Link to="/pedidos" className={cardClass}>
            <QuickActionCopy icon={ClipboardList} title="Meus pedidos" description="Acompanhe seus pedidos" />
          </Link>
        </li>
        <li className="min-w-0">
          <Link to="/ofertas" className={cardClass}>
            <QuickActionCopy icon={Tag} title="Promoções" description="Veja as ofertas disponíveis" />
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Banner de atendimento, sempre no fim do fluxo e sem sobrepor outros blocos. */
export function HomeWhatsAppBanner() {
  const href = `https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent("Olá, Netinho Auto Parts! Preciso de ajuda para encontrar uma peça.")}`;
  return (
    <section aria-label="Atendimento pelo WhatsApp">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-gold/60 bg-navy p-4 text-navy-foreground shadow-home-card transition-colors hover:bg-navy-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:grid-cols-[auto_minmax(0,1fr)_auto]"
      >
        <HomeIconTile icon={MessageCircle} className="bg-navy-deep" />
        <span className="min-w-0">
          <strong className="block text-base font-black">Precisa de ajuda?</strong>
          <small className="block text-sm text-navy-foreground/80">Nossa equipe atende você pelo WhatsApp</small>
        </span>
        <span className="col-span-2 inline-flex items-center justify-center gap-1 rounded-full bg-gold px-4 py-2 text-sm font-black text-gold-foreground sm:col-span-1">
          Fale conosco <ChevronRight size={HOME_ICON_SIZE - 4} strokeWidth={HOME_ICON_STROKE} aria-hidden="true" />
        </span>
      </a>
    </section>
  );
}
