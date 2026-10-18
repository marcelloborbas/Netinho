import { Globe2, Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export function BrandFooter() {
  return (
    <footer className="brand-footer">
      <div className="brand-footer-inner">
        <Link to="/" aria-label="Netinho Auto Parts — início" className="brand-footer-home">
          <Logo className="brand-footer-logo" />
        </Link>
        <div className="brand-footer-links">
          <a href={`tel:${BRAND.phoneDigits}`}>
            <Phone size={16} aria-hidden="true" />
            {BRAND.phone}
          </a>
          <a href={`https://${BRAND.domain}`}>
            <Globe2 size={16} aria-hidden="true" />
            {BRAND.domain}
          </a>
        </div>
      </div>
    </footer>
  );
}
