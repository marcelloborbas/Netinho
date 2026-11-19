import { Link } from "@tanstack/react-router";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_SECTIONS, filterAdminSections, type AdminSectionId } from "@/lib/admin-sections";

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

function SectionSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative block">
      <span className="sr-only">Buscar função do painel</span>
      <Search
        size={16}
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        aria-label="Buscar função do painel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar função (ex.: comissão, WhatsApp)"
        className="min-h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
    </label>
  );
}

/** Painel administrativo único: navegação interna por seções e conteúdo da seção ativa. */
export function AdminPanel({ section }: { section: AdminSectionId }) {
  const [term, setTerm] = useState("");
  const results = filterAdminSections(term);
  const chipsRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const Active = SECTIONS[section];

  useEffect(() => {
    chipsRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [section]);

  const linkFor = (id: AdminSectionId) => ({ to: "/admin" as const, search: { secao: id } });

  return (
    <div className="text-navy">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.18em] text-gold-deep">
            <ShieldCheck size={13} aria-hidden="true" /> Painel administrativo
          </p>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">Central Netinho</h1>
        </div>
        <div className="w-full sm:w-72 lg:hidden">
          <SectionSearch value={term} onChange={setTerm} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start">
        {/* Celular/tablet: faixa de seções rolável e fixa no topo. */}
        <nav
          aria-label="Seções do painel"
          className="sticky top-0 z-30 -mx-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden"
        >
          <div
            ref={chipsRef}
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none]"
          >
            {results.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                {...linkFor(id)}
                aria-current={id === section ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold",
                  id === section
                    ? "border-navy bg-navy text-navy-foreground [&_svg]:text-gold"
                    : "border-border bg-card text-navy",
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            ))}
            {results.length === 0 && (
              <span className="py-2 text-xs text-muted-foreground">Nenhuma função encontrada.</span>
            )}
          </div>
        </nav>
        {/* Desktop: menu lateral fixo com busca. */}
        <aside className="sticky top-4 hidden space-y-2 rounded-2xl border border-border bg-card p-2 shadow-sm lg:block">
          <SectionSearch value={term} onChange={setTerm} />
          <nav aria-label="Seções do painel (lateral)">
            <ul className="space-y-0.5">
              {results.map(({ id, label, description, icon: Icon }) => (
                <li key={id}>
                  <Link
                    {...linkFor(id)}
                    aria-current={id === section ? "page" : undefined}
                    title={description}
                    className={cn(
                      "flex min-h-10 items-center gap-2.5 rounded-xl px-2.5 text-sm font-bold transition-colors",
                      id === section
                        ? "bg-navy text-navy-foreground [&_svg]:text-gold"
                        : "text-navy hover:bg-muted",
                    )}
                  >
                    <Icon size={17} aria-hidden="true" className="shrink-0 text-gold-deep" />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">Nenhuma função encontrada.</p>
            )}
          </nav>
          <p className="px-2 pb-1 text-[11px] text-muted-foreground">
            {ADMIN_SECTIONS.length} áreas reunidas nesta página.
          </p>
        </aside>
        <div className="min-w-0">
          <SectionBoundary key={section}>
            <Suspense fallback={<SectionSkeleton />}>
              <Active />
            </Suspense>
          </SectionBoundary>
        </div>
      </div>
    </div>
  );
}
