import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/** Ícone oficial da NETINHO (imagem enviada pelo cliente). */
/** Animação discreta e permanente da marca, sem JavaScript nem serviços externos. */
const logoAnimation = `@keyframes netinhoFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.035); } } @keyframes netinhoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }`;

export function LogoMark({ className }: { className?: string }) {
  return (
    <>
      <style>{logoAnimation}</style>
      <img
        src="/favicon.png"
        alt=""
        aria-hidden="true"
        width={192}
        height={192}
        className={cn(
          "rounded-full object-contain transition-transform duration-300 hover:scale-110",
          className,
        )}
      />
    </>
  );
}

interface LogoProps {
  className?: string;
  showPhone?: boolean;
  size?: "sm" | "lg";
}

export function Logo({ className, showPhone = false, size = "sm" }: LogoProps) {
  const lg = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={lg ? "h-24 w-24" : "h-14 w-14"} />
      <div className="brand-wordmark leading-none">
        <div
          className={cn(
            "brand-wordmark-name font-display font-extrabold tracking-wide text-foreground",
            lg ? "text-5xl" : "text-[2rem]",
          )}
        >
          {BRAND.name}
        </div>
        <div
          className={cn(
            "brand-wordmark-tagline mt-1 font-semibold uppercase tracking-[0.2em] text-metal",
            lg ? "text-xs" : "text-[9px]",
          )}
        >
          <span>AUTO PARTS</span>
        </div>
        {showPhone && (
          <div aria-label={`Telefone Netinho: ${BRAND.phone}`} className="mt-2 text-sm font-bold text-green-400 whitespace-nowrap">
            {BRAND.phone}
          </div>
        )}
      </div>
    </div>
  );
}
