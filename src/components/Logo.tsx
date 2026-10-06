import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import logoAsset from "@/assets/netinho-logo.png.asset.json";

/** Emblema oficial da NETINHO (enviado pelo cliente). */
export function LogoMark({ className }: { className?: string }) {
  return <img src={logoAsset.url} alt="" aria-hidden="true" className={cn("rounded-full object-contain", className)} />;
}

interface LogoProps { className?: string; showPhone?: boolean; size?: "sm" | "lg" }

export function Logo({ className, showPhone = false, size = "sm" }: LogoProps) {
  const lg = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={lg ? "h-28 w-28" : "h-10 w-10"} />
      <div className="leading-none">
        <div className={cn("font-display font-extrabold tracking-wide text-foreground", lg ? "text-5xl" : "text-2xl")}>
          {BRAND.name}
        </div>
        <div className={cn("mt-1 font-semibold uppercase tracking-[0.2em] text-metal", lg ? "text-xs" : "text-[9px]")}>
          {BRAND.tagline}
        </div>
        {showPhone && <div className="mt-1.5 text-sm font-semibold text-primary">{BRAND.phone}</div>}
      </div>
    </div>
  );
}
