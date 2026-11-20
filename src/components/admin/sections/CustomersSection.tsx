import { UserRound } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { CustomersManager } from "@/components/customers/CustomersManager";

/** Clientes de todas as carteiras (visão do administrador). */
export function CustomersSection() {
  return (
    <div className="space-y-3">
      <AdminSectionHeader
        icon={UserRound}
        title="Clientes"
        description="Todas as carteiras; transferências entre representantes ficam em Pessoas e Comissões → Carteira"
      />
      <CustomersManager compactAdmin />
    </div>
  );
}
