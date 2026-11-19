import { Link } from "@tanstack/react-router";
import { BookOpen, Factory } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { SupplierCommissions } from "@/components/SupplierCommissions";

const CATALOGS = [
  { brand: "FCO", label: "FCO Automotive — catálogo" },
  { brand: "HD", label: "HD Embreagens — catálogo" },
] as const;

/** Distribuidoras: atalhos dos catálogos e comissões por pedido/fornecedor. */
export function SuppliersSection() {
  return (
    <div className="space-y-3 text-navy">
      <AdminSectionHeader
        icon={Factory}
        title="Fornecedores"
        description="Catálogos das distribuidoras e comissões de repasse FCO/HD"
      />
      <nav
        aria-label="Catálogos dos fornecedores"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {CATALOGS.map((catalog) => (
          <Link
            key={catalog.brand}
            to="/catalogo"
            search={{ marca: catalog.brand, modo: "consulta" }}
            className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold shadow-sm hover:border-gold"
          >
            <BookOpen size={18} aria-hidden="true" className="text-gold-deep" />
            {catalog.label}
          </Link>
        ))}
      </nav>
      <SupplierCommissions />
    </div>
  );
}
