import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Padrão único para os ícones da página inicial: tamanho, traço e contraste. */
export const HOME_ICON_SIZE = 22;
export const HOME_ICON_STROKE = 2;

export interface HomeIconTileProps {
  icon: LucideIcon;
  className?: string;
}

/** Ícone dourado em quadro azul-marinho, sempre com proporção fixa. */
export function HomeIconTile({ icon: Icon, className }: HomeIconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/50 bg-navy text-gold shadow-sm",
        className,
      )}
    >
      <Icon size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} absoluteStrokeWidth />
    </span>
  );
}
