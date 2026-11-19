import { Globe2, MailCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

export function BrandFooter() {
  return (
    <footer className="brand-footer">
      <div className="brand-footer-inner">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "nowrap",
            minWidth: 0,
          }}
        >
          <Link
            to="/"
            aria-label="Netinho Auto Parts — início"
            className="brand-footer-home"
            style={{ flexShrink: 0 }}
          >
            <Logo className="brand-footer-logo" />
          </Link>
          <a
            href={`https://wa.me/${BRAND.phoneDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${BRAND.phone}`}
            title="Conversar pelo WhatsApp"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              color: "#22c55e",
              fontWeight: 800,
              fontSize: 13,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <WhatsAppIcon size={19} />
            <span>{BRAND.phone}</span>
          </a>
        </div>
        <div
          className="brand-footer-links"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px 18px",
            fontSize: "clamp(18px, 2.2vw, 23px)",
            fontWeight: 700,
          }}
        >
          <a
            href={`https://${BRAND.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}
          >
            <Globe2 size={23} strokeWidth={2.2} color="#38bdf8" aria-hidden="true" />
            {BRAND.domain}
          </a>
          <a
            href={`mailto:${BRAND.orderEmail}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}
          >
            <MailCheck size={23} strokeWidth={2.2} color="#fbbf24" aria-hidden="true" />
            {BRAND.orderEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
