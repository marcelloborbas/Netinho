import { Globe2, Mail, MessageCircle } from "lucide-react";
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
        <a href={`https://wa.me/${BRAND.phoneDigits}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${BRAND.phone}`} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:12,background:"#16a34a",color:"white",fontWeight:800,fontSize:16,boxShadow:"0 4px 16px rgba(22,163,74,.4)",textDecoration:"none",whiteSpace:"nowrap"}}><MessageCircle size={23} strokeWidth={2.5} aria-hidden="true" />{BRAND.phone}</a>
        <div className="brand-footer-links">
          <a href={`https://${BRAND.domain}`}>
            <Globe2 size={16} aria-hidden="true" />
            {BRAND.domain}
          </a>
          <a href={`mailto:${BRAND.orderEmail}`}>
            <Mail size={16} aria-hidden="true" />
            {BRAND.orderEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
