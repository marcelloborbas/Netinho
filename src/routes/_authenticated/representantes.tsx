import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/representantes")({ component: Page });
function Page() {
 const { data: access } = useQuery(accessQuery);
 return <section className="surface-card mx-auto max-w-4xl space-y-4 p-6">
 <h1 className="text-2xl font-bold">Representantes</h1><p className="text-muted-foreground">Fichas e mapas das regiões de atuação.</p>
 {access?.level === 1 ? <div className="grid gap-3 sm:grid-cols-2">
 <Link to="/representante" className="action-card flex min-h-20 items-center justify-center rounded-xl bg-[#102a52] px-4 py-4 text-center text-base font-bold !text-white shadow-md transition-colors hover:bg-[#17457d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Abdenego Eugênio — ficha e mapa</Link><Link to="/representante-livaldo" className="action-card flex min-h-20 items-center justify-center rounded-xl bg-[#102a52] px-4 py-4 text-center text-base font-bold !text-white shadow-md transition-colors hover:bg-[#17457d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Livaldo Souza Silva — ficha e mapa</Link>
 <Link to="/admin" className="action-card flex min-h-20 items-center justify-center rounded-xl bg-[#102a52] px-4 py-4 text-center text-base font-bold !text-white shadow-md transition-colors hover:bg-[#17457d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Administração e cadastros</Link>
 </div> : <p>Área reservada à administração.</p>}
 </section>;
}