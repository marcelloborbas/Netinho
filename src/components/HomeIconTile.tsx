import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Traço e tamanho únicos para todos os ícones da página inicial e da navegação. */
export const HOME_ICON_SIZE = 22;
export const HOME_ICON_STROKE = 2;

export interface HomeIconTileProps {
  icon: LucideIcon;
  className?: string;
}

/** Ícone Lucide dourado sobre quadro azul-marinho, com proporção fixa 1:1. */
export function HomeIconTile({ icon: Icon, className }: HomeIconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-gold ring-1 ring-gold/40", className)}
    >
      <Icon size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} absoluteStrokeWidth />
    </span>
  );
}
