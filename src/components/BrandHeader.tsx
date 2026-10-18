import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { PartnerLogos } from "@/components/PartnerLogos";

export function BrandHeader() {
  return (
    <header className="app-header brand-header">
      <div className="brand-header-inner">
        <Link to="/" aria-label="Início Netinho" className="brand-header-home">
          <Logo className="brand-header-logo" />
        </Link>
        <div className="brand-header-representations">
          <p>Representante Oficial</p>
          <PartnerLogos compact linked={false} />
        </div>
      </div>
    </header>
  );
}
