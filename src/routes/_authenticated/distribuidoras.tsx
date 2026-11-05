import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/distribuidoras")({
  head: () => pageHead("/distribuidoras", "Distribuidoras | Netinho Auto Parts", "Área administrativa com acesso aos catálogos de fornecedores e cadastros comerciais da Netinho Auto Parts."), component: Page });
function Page() {
 const { data: access } = useQuery(accessQuery);
 return <section className="surface-card mx-auto max-w-4xl space-y-4 p-6">
      <AdminPageNavigation/>
 
 {access?.level === 1 ? <div className="grid gap-3 sm:grid-cols-2">
 <Link to="/catalogo" search={{ marca: "FCO", modo: "consulta" }} className="action-card">FCO Automotive — catálogo</Link><Link to="/catalogo" search={{ marca: "HD", modo: "consulta" }} className="action-card">HD Embreagens — catálogo</Link>
 <Link to="/admin" className="action-card">Administração e cadastros</Link>
 </div> : <p>Área reservada à administração.</p>}
 </section>;
}