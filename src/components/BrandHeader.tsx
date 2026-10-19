import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PartnerLogos } from "@/components/PartnerLogos";
import { BRAND } from "@/lib/brand";

export function BrandHeader({ actions }: { actions?: ReactNode }) {
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
            <MessageCircle size={15} strokeWidth={2.4} aria-hidden="true" />
            <span>{BRAND.phone}</span>
          </a>
        </div>
        <div className="brand-header-representations">
          <p>Representante Oficial</p>
          <PartnerLogos compact downloads linked={false} />
          {actions && <div className="brand-header-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
