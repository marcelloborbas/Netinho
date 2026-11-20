import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ADMIN_SECTIONS, type AdminSectionId } from "@/lib/admin-sections";

const MAIN: AdminSectionId[] = ["pessoas", "pedidos", "clientes", "vendas", "fornecedores"];
const SUPPORT: AdminSectionId[] = ["cadastros", "comunicacao", "configuracoes"];

/** Página inicial: uma entrada por tarefa, sem relatórios ou menus duplicados. */
export function OverviewSection() {
  const sections = (ids: AdminSectionId[]) => ids.map((id) => {
    const section = ADMIN_SECTIONS.find((item) => item.id === id);
    if (!section) return null;
    const { label, description, icon: Icon } = section;
    return (
      <Link key={id} to="/admin" search={{ secao: id }}
        className="group flex min-h-[78px] items-center gap-3 rounded-2xl border border-[#d9e0e8] bg-white p-4 shadow-sm transition-colors hover:border-[#102a52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102a52]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#102a52] text-white" aria-hidden="true"><Icon size={22}/></span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-extrabold text-[#102a52]">{label}</strong>
          <span className="block text-xs leading-snug text-muted-foreground">{description}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[#102a52] transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
      </Link>
    );
  });
  return (
    <div className="space-y-5">
      <nav aria-label="Funções principais" className="grid grid-cols-1 gap-3 sm:grid-cols-2">{sections(MAIN)}</nav>
      <section aria-label="Ferramentas complementares" className="border-t border-border pt-4">
        <h2 className="mb-3 text-sm font-extrabold text-[#102a52]">Outras ferramentas</h2>
        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3">{sections(SUPPORT)}</nav>
      </section>
    </div>
  );
}
