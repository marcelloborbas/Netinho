import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface AdminStat {
  label: string;
  value: ReactNode;
}

export interface AdminSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  stats?: AdminStat[] | undefined;
  /** Ações rápidas da seção (ex.: "Adicionar pessoa"). */
  actions?: ReactNode | undefined;
}

/** Faixa compacta padrão no topo de cada seção do painel administrativo. */
export function AdminSectionHeader({
  icon: Icon,
  title,
  description,
  stats,
  actions,
}: AdminSectionHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-navy px-4 py-3 text-navy-foreground shadow-md sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-soft text-gold"
          aria-hidden="true"
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight sm:text-xl">{title}</h2>
          {description && <p className="text-xs text-navy-foreground/80">{description}</p>}
        </div>
      </div>
      {stats && stats.length > 0 && (
        <dl className="order-3 flex w-full flex-wrap gap-2 text-xs sm:order-none sm:w-auto">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-baseline gap-1.5 rounded-lg bg-navy-soft px-2.5 py-1.5"
            >
              <dt className="text-navy-foreground/80">{stat.label}</dt>
              <dd className="text-sm font-black text-gold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions}
    </header>
  );
}
