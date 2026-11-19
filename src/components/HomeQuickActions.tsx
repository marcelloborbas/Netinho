import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  MessageCircle,
  Search,
  ShoppingCart,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { HomeIconTile } from "@/components/HomeIconTile";

/** Cartão compacto horizontal: ícone, título e descrição em uma linha cada. */
const cardClass =
  "group flex h-full min-h-[52px] min-w-0 items-center gap-2 rounded-xl border border-gold/70 bg-card px-2 py-1.5 text-navy shadow-home-card transition-colors hover:border-gold hover:bg-gold-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy sm:gap-3 sm:px-3 sm:py-2";

interface QuickActionCopyProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

function QuickActionCopy({ icon, title, description }: QuickActionCopyProps) {
  return (
    <>
      <HomeIconTile icon={icon} size="sm" />
      <span className="min-w-0">
        <strong className="block truncate text-[13px] font-black leading-tight sm:text-sm">
          {title}
        </strong>
        <small className="block truncate text-[11px] leading-tight text-muted-foreground sm:text-xs">
          {description}
        </small>
      </span>
    </>
  );
}

/** Quatro atalhos em grade 2×2 no celular e 4 colunas no computador. */
export function HomeQuickActions({ className }: { className?: string }) {
  return (
    <section className={cn("min-w-0", className)} aria-labelledby="home-quick-title">
      <h2 id="home-quick-title" className="sr-only">
        Acesso rápido
      </h2>
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <li className="min-w-0">
          <Link to="/vendas" search={{ modo: "venda", q: "", promo: "" }} className={cardClass}>
            <QuickActionCopy
              icon={ShoppingCart}
              title="Novo pedido"
              description="Monte um pedido"
            />
          </Link>
        </li>
        <li className="min-w-0">
          <Link to="/catalogo" className={cardClass}>
            <QuickActionCopy
              icon={Search}
              title="Consultar peças"
              description="Pesquise no catálogo"
            />
          </Link>
        </li>
        <li className="min-w-0">
          <Link to="/pedidos" className={cardClass}>
            <QuickActionCopy
              icon={ClipboardList}
              title="Meus pedidos"
              description="Acompanhe o status"
            />
          </Link>
        </li>
        <li className="min-w-0">
          <Link to="/ofertas" className={cardClass}>
            <QuickActionCopy icon={Tag} title="Promoções" description="Veja as ofertas" />
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Atendimento pelo WhatsApp integrado ao cabeçalho, no fluxo normal (sem sobrepor conteúdo). */
export function HomeWhatsAppButton() {
  const href = `https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent("Olá, Netinho Auto Parts! Preciso de ajuda para encontrar uma peça.")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Netinho pelo WhatsApp"
      className="flex shrink-0 items-center gap-2 rounded-xl border border-gold/60 bg-navy-deep/70 p-0.5 text-navy-foreground transition-colors hover:bg-navy-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:pr-3"
    >
      <HomeIconTile icon={MessageCircle} size="sm" />
      <span className="hidden text-left leading-tight sm:block">
        <strong className="block text-sm font-black">WhatsApp</strong>
        <small className="block text-xs text-navy-foreground/80">Fale conosco</small>
      </span>
    </a>
  );
}
