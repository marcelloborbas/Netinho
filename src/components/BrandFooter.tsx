import { Globe2, MailCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export function BrandFooter() {
  return (
    <footer className="brand-footer">
      <div className="brand-footer-inner">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "nowrap", minWidth: 0 }}>
          <Link to="/" aria-label="Netinho Auto Parts — início" className="brand-footer-home" style={{ flexShrink: 0 }}>
            <Logo className="brand-footer-logo" />
          </Link>
          <a href={`https://wa.me/${BRAND.phoneDigits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${BRAND.phone}`} title="Conversar pelo WhatsApp" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#22c55e", fontWeight: 800, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}><path fill="#25D366" d="M16 2C8.3 2 2 8.2 2 16c0 2.5.7 4.8 1.9 6.9L2 30l7.3-1.9A14 14 0 1 0 16 2Z"/><path fill="#fff" d="M16 5a11 11 0 0 0-9.5 16.5l.6 1-1 3.5 3.6-1 .9.5A11 11 0 1 0 16 5Zm6.5 15.6c-.3.9-1.8 1.7-2.5 1.8-.6.1-1.3.2-4.3-1-3.6-1.5-5.9-5.2-6.1-5.5-.2-.3-1.4-1.8-1.4-3.5s.9-2.5 1.2-2.9c.3-.3.7-.4 1-.4h.7c.2 0 .5 0 .7.6l1 2.4c.1.3.1.5-.1.8l-.8 1c-.2.2-.3.4-.1.7.2.4 1 1.7 2.1 2.6 1.4 1.2 2.5 1.6 2.9 1.8.3.1.5.1.7-.2l1.2-1.4c.2-.3.5-.3.8-.2l2.5 1.2c.4.2.6.3.7.5.1.2.1 1-.2 1.7Z"/></svg>
            <span>{BRAND.phone}</span>
          </a>
        </div>
        <div className="brand-footer-links" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px 18px", fontSize: "clamp(18px, 2.2vw, 23px)", fontWeight: 700 }}>
          <a href={`https://${BRAND.domain}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <Globe2 size={23} strokeWidth={2.2} color="#38bdf8" aria-hidden="true" />
            {BRAND.domain}
          </a>
          <a href={`mailto:${BRAND.orderEmail}`} style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <MailCheck size={23} strokeWidth={2.2} color="#fbbf24" aria-hidden="true" />
            {BRAND.orderEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
