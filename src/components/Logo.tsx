import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/** Marca de obturador vermelha (inspirada no logo de referência). */
export function LogoMark({ className }: { className?: string }) {
  const blades = Array.from({ length: 6 }, (_, i) => i * 60);
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="48" className="fill-primary" />
      {blades.map((a) => (
        <line key={a} x1="50" y1="50" x2="50" y2="2" transform={`rotate(${a} 50 50) translate(14 0)`}
          className="stroke-background" strokeWidth="5" />
      ))}
      <circle cx="50" cy="50" r="13" className="fill-background" />
    </svg>
  );
}

interface LogoProps { className?: string; showPhone?: boolean; size?: "sm" | "lg" }

export function Logo({ className, showPhone = false, size = "sm" }: LogoProps) {
  const lg = size === "lg";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className={lg ? "h-16 w-16" : "h-9 w-9"} />
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
