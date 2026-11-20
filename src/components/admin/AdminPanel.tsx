import { Link } from "@tanstack/react-router";
import {
  Component,
  lazy,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import type { AdminSectionId } from "@/lib/admin-sections";

/** Cada seção é carregada só quando aberta, para o painel abrir rápido. */
const SECTIONS: Record<AdminSectionId, ComponentType> = {
  "visao-geral": lazy(() =>
    import("./sections/OverviewSection").then((m) => ({ default: m.OverviewSection })),
  ),
  pessoas: lazy(() =>
    import("./sections/PeopleSection").then((m) => ({ default: m.PeopleSection })),
  ),
  clientes: lazy(() =>
    import("./sections/CustomersSection").then((m) => ({ default: m.CustomersSection })),
  ),
  pedidos: lazy(() =>
    import("./sections/OrdersSection").then((m) => ({ default: m.OrdersSection })),
  ),
  vendas: lazy(() => import("./sections/SalesSection").then((m) => ({ default: m.SalesSection }))),
  fornecedores: lazy(() =>
    import("./sections/SuppliersSection").then((m) => ({ default: m.SuppliersSection })),
  ),
  cadastros: lazy(() =>
    import("./sections/RegistrationsSection").then((m) => ({ default: m.RegistrationsSection })),
  ),
  comunicacao: lazy(() =>
    import("./sections/CommunicationSection").then((m) => ({ default: m.CommunicationSection })),
  ),
  representantes: lazy(() =>
    import("./sections/RepresentativesSection").then((m) => ({
      default: m.RepresentativesSection,
    })),
  ),
  configuracoes: lazy(() =>
    import("./sections/SettingsSection").then((m) => ({ default: m.SettingsSection })),
  ),
};

/** Impede que a falha de uma seção derrube o painel inteiro. */
class SectionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("admin-section:", error, info.componentStack);
  }
  override render() {
    if (this.state.failed)
      return (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Esta seção não pôde ser exibida. Recarregue a página ou escolha outra seção.
        </div>
      );
    return this.props.children;
  }
}

function SectionSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando seção">
      <div className="h-16 animate-pulse rounded-2xl bg-navy/80" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

/** Painel administrativo único: navegação interna por seções e conteúdo da seção ativa. */
export function AdminPanel({ section }: { section: AdminSectionId }) {
  const Active = SECTIONS[section];

  return (
    <div className="text-navy">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black uppercase tracking-wide text-navy sm:text-2xl">PAINEL ADMINISTRATIVO</h1>
        {section !== "visao-geral" && <Link to="/admin" search={{secao:"visao-geral"}} className="rounded-xl border border-gold px-3 py-2 text-sm font-bold text-navy hover:bg-gold/10">Voltar ao painel</Link>}
      </header>
      <SectionBoundary key={section}>
        <Suspense fallback={<SectionSkeleton />}><Active /></Suspense>
      </SectionBoundary>
    </div>
  );
}
