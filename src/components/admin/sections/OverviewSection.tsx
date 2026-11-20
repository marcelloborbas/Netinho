import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";

/** Entrada direta e simples: somente as funções administrativas, sem pedidos duplicados. */
export function OverviewSection() {
  return (
    <nav aria-label="Funções administrativas" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ADMIN_SECTIONS.filter((section) => section.id !== "visao-geral" && section.id !== "representantes").map(({ id, label, description, icon: Icon }) => (
        <Link key={id} to="/admin" search={{ secao: id }}
          className="group flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white" aria-hidden="true">
            <Icon size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-extrabold text-navy">{label}</strong>
            <span className="block text-xs text-muted-foreground">{description}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-navy transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
