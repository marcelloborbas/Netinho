import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import iconAsset from "@/assets/netinho-icon.webp.asset.json";

/** Ícone oficial da NETINHO (imagem enviada pelo cliente). */
export function LogoMark({ className }: { className?: string }) {
  return <img src={iconAsset.url} alt="" aria-hidden="true" width={192} height={192}
    className={cn("rounded-full object-contain", className)} />;
}

interface LogoProps { className?: string; showPhone?: boolean; size?: "sm" | "lg" }

export function Logo({ className, showPhone = false, size = "sm" }: LogoProps) {
  const lg = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={lg ? "h-24 w-24" : "h-10 w-10"} />
      <div className="leading-none">
        <div className={cn("font-display font-extrabold tracking-wide text-foreground", lg ? "text-5xl" : "text-2xl")}>
          {BRAND.name}
        </div>
        <div className={cn("mt-1 font-semibold uppercase tracking-[0.2em] text-metal", lg ? "text-xs" : "text-[9px]")}>
          {BRAND.tagline.replace("Representações · ", "")}
        </div>
        {showPhone && <div className="mt-1.5 text-sm font-semibold text-primary">{BRAND.phone}</div>}
      </div>
    </div>
  );
}
