import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/representantes")({ component: Page });
function Page() {
 const { data: access } = useQuery(accessQuery);
 return <section className="surface-card mx-auto max-w-4xl space-y-4 p-6">
 <h1 className="text-2xl font-bold">Representantes</h1><p className="text-muted-foreground">Fichas e mapas das regiões de atuação.</p>
 {access?.level === 1 ? <div className="grid gap-3 sm:grid-cols-2">
 <Link to="/representante" className="action-card">Abdenego Eugênio — ficha e mapa</Link><Link to="/representante-livaldo" className="action-card">Livaldo Souza Silva — ficha e mapa</Link>
 <Link to="/admin" className="action-card">Administração e cadastros</Link>
 </div> : <p>Área reservada à administração.</p>}
 </section>;
}