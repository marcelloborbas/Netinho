import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";
import { PartnerLogos } from "@/components/PartnerLogos";
import { BRAND } from "@/lib/brand";

export function BrandHeader({ actions }: { actions?: ReactNode }) {
  const pathname = useLocation().pathname;
  const items = [{ to: "/", label: "Início" }, { to: "/catalogo", label: "Catálogo" }, { to: "/clientes", label: "Clientes" }, { to: "/pedidos", label: "Pedidos" }];
  return (
    <header className="app-header brand-header">
      <div className="brand-header-inner">
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <Link to="/" aria-label="Início Netinho" className="brand-header-home">
            <Logo className="brand-header-logo" />
          </Link>
          <a href={`https://wa.me/${BRAND.phoneDigits}`} target="_blank" rel="noopener noreferrer"
            aria-label={`WhatsApp Netinho ${BRAND.phone}`}
            className="brand-header-whatsapp">
            <svg width="21" height="21" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0"><path fill="#25D366" d="M16 2C8.3 2 2 8.2 2 16c0 2.5.7 4.8 1.9 6.9L2 30l7.3-1.9A14 14 0 1 0 16 2Z"/><path fill="#fff" d="M16 5a11 11 0 0 0-9.5 16.5l.6 1-1 3.5 3.6-1 .9.5A11 11 0 1 0 16 5Zm6.5 15.6c-.3.9-1.8 1.7-2.5 1.8-.6.1-1.3.2-4.3-1-3.6-1.5-5.9-5.2-6.1-5.5-.2-.3-1.4-1.8-1.4-3.5s.9-2.5 1.2-2.9c.3-.3.7-.4 1-.4h.7c.2 0 .5 0 .7.6l1 2.4c.1.3.1.5-.1.8l-.8 1c-.2.2-.3.4-.1.7.2.4 1 1.7 2.1 2.6 1.4 1.2 2.5 1.6 2.9 1.8.3.1.5.1.7-.2l1.2-1.4c.2-.3.5-.3.8-.2l2.5 1.2c.4.2.6.3.7.5.1.2.1 1-.2 1.7Z"/></svg>
            <span>{BRAND.phone}</span>
          </a>
        </div>
        <div className="brand-header-representations">
          <p>Representante Oficial</p>
          <PartnerLogos compact downloads linked={false} />
          {actions && <div className="brand-header-actions">{actions}</div>}
        </div>
        <nav className="brand-header-menu" aria-label="Menu principal do cabeçalho">
          {items.map((item) => <Link key={item.to} to={item.to} className={`brand-header-menu-link ${pathname === item.to ? "is-active" : ""}`}>{item.label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
