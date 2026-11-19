import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Padrão único para os ícones da página inicial: tamanho, traço e contraste. */
export const HOME_ICON_SIZE = 22;
export const HOME_ICON_STROKE = 2;

export interface HomeIconTileProps {
  icon: LucideIcon;
  /** "md" para cartões principais; "sm" para cabeçalho e indicadores compactos. O ícone mantém 22px. */
  size?: "md" | "sm";
  className?: string;
}

/** Ícone dourado em quadro azul-marinho, sempre com proporção fixa. */
export function HomeIconTile({ icon: Icon, size = "md", className }: HomeIconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border border-gold/50 bg-navy text-gold shadow-sm",
        size === "md" ? "h-11 w-11" : "h-9 w-9 rounded-lg",
        className,
      )}
    >
      <Icon size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} absoluteStrokeWidth />
    </span>
  );
}
