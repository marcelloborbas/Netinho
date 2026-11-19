import { BarChart3 } from "lucide-react";
import { HomeSalesEvolution } from "@/components/HomeSalesEvolution";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { RepresentativeSalesReport } from "@/components/admin/RepresentativeSalesReport";

/** Evolução consolidada das vendas e o ranking por representante, na mesma seção. */
export function SalesSection() {
  return (
    <div className="space-y-4">
      <AdminSectionHeader
        icon={BarChart3}
        title="Vendas e comissões"
        description="Pedidos registrados, sem orçamentos e cancelamentos; comissões estimadas pelas taxas cadastradas"
      />
      <div className="[&>section]:!mx-0">
        <HomeSalesEvolution />
      </div>
      <RepresentativeSalesReport />
    </div>
  );
}
