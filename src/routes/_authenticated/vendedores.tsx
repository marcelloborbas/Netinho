import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
export const Route = createFileRoute("/_authenticated/vendedores")({ component: Vendedores });
function Vendedores() {
  const { data: access } = useQuery(accessQuery);
  return <section className="surface-card mx-auto max-w-4xl space-y-4 p-6">
    <h1 className="text-2xl font-bold">Vendedores</h1>
    <p className="text-muted-foreground">Gestão de vendedores e representantes comerciais.</p>
    {access?.level === 1 ? <>
      <p>Cadastre e autorize vendedores no painel administrativo. O cadastro individual e a região de atuação são gerenciados junto aos representantes.</p>
      <Link to="/admin-gestao" hash="representantes" className="classic-button">Gerenciar vendedores e autorizações</Link>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/representante" className="action-card">Representante Abdenego · mapa e ficha</Link>
        <Link to="/representante-livaldo" className="action-card">Representante Livaldo · mapa e ficha</Link>
      </div>
    </> : <p>Somente o administrador pode gerenciar os vendedores.</p>}
  </section>;
}
