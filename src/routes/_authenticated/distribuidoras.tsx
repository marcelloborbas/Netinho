import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/distribuidoras")({ component: Page });
function Page() {
 const { data: access } = useQuery(accessQuery);
 return <section className="surface-card mx-auto max-w-4xl space-y-4 p-6">
 <h1 className="text-2xl font-bold">Distribuidoras</h1><p className="text-muted-foreground">Marcas representadas e recebimento de pedidos.</p>
 {access?.level === 1 ? <div className="grid gap-3 sm:grid-cols-2">
 <Link to="/catalogo" search={{ marca: "FCO", modo: "consulta" }} className="action-card">FCO Automotive — catálogo</Link><Link to="/catalogo" search={{ marca: "HD", modo: "consulta" }} className="action-card">HD Embreagens — catálogo</Link>
 <Link to="/admin" className="action-card">Administração e cadastros</Link>
 </div> : <p>Área reservada à administração.</p>}
 </section>;
}