import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { CatalogDownload } from "@/components/CatalogDownload";

export function BrandHeader() {
  return (
    <header className="app-header brand-header">
      <div className="brand-header-inner">
        <Link to="/" aria-label="Início Netinho" className="brand-header-home">
          <Logo className="brand-header-logo" />
        </Link>
        <div className="brand-header-representations">
          <p>Representante Oficial</p>
          <div className="partner-logos partner-logos-compact" aria-label="Baixar catálogos">
            {([{ brand: "FCO", image: "/images/brands/fco.webp", name: "FCO Automotive" }, { brand: "HD", image: "/images/brands/hd.png", name: "HD Embreagens" }] as const).map(item => (
              <CatalogDownload key={item.brand} brand={item.brand} className="partner-logo" iconOnly image={item.image} name={item.name} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
