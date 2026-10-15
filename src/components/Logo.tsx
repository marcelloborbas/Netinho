import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import iconAsset from "@/assets/netinho-icon.webp.asset.json";

/** Ícone oficial da NETINHO (imagem enviada pelo cliente). */
/** Animação discreta e permanente da marca, sem JavaScript nem serviços externos. */
const logoAnimation = `@keyframes netinhoFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.035); } } @keyframes netinhoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }`;

export function LogoMark({ className }: { className?: string }) {
  return <><style>{logoAnimation}</style><img src={iconAsset.url} alt="" aria-hidden="true" width={192} height={192}
    className={cn("rounded-full object-contain motion-safe:animate-[netinhoFloat_3s_ease-in-out_infinite] transition-transform duration-300 hover:scale-110", className)} /></>;
}

interface LogoProps { className?: string; showPhone?: boolean; size?: "sm" | "lg" }

export function Logo({ className, showPhone = false, size = "sm" }: LogoProps) {
  const lg = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={lg ? "h-24 w-24" : "h-14 w-14"} />
      <div className="leading-none">
        <div className={cn("font-display font-extrabold tracking-wide text-foreground", lg ? "text-5xl" : "text-[2rem]")}>
          {BRAND.name}
        </div>
        <div className={cn("mt-1 font-semibold uppercase tracking-[0.2em] text-metal", lg ? "text-xs" : "text-[9px]")}>
          {BRAND.tagline.replace("Representações · ", "")}
        </div>
        {showPhone && <div aria-label={`WhatsApp Netinho: ${BRAND.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-green-400"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.08 0C5.52 0 .18 5.34.18 11.9c0 2.1.55 4.16 1.59 5.97L.08 24l6.28-1.65a11.9 11.9 0 0 0 5.7 1.45h.01c6.56 0 11.9-5.34 11.9-11.9a11.82 11.82 0 0 0-3.45-8.42ZM12.07 21.8a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.73.98.99-3.64-.23-.37a9.88 9.88 0 0 1-1.52-5.28c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 7c0 5.45-4.44 9.89-9.89 9.89Zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.71.63.72.23 1.38.2 1.9.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg><span>{BRAND.phone}</span></div>}
      </div>
    </div>
  );
}
