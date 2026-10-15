import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ArrowLeft, LockKeyhole } from "lucide-react";

export const Route = createFileRoute("/representante")({
  component: RepresentativePage,
  head: () => ({ meta: [{ title: "Representante Comercial | Netinho Auto Parts" }] }),
});

const cities = ["São José dos Campos", "Jacareí", "Mogi das Cruzes", "Caçapava", "Taubaté", "Pindamonhangaba", "Guaratinguetá", "Lorena", "Cruzeiro", "Caraguatatuba", "Ubatuba", "São Sebastião"];

function RepresentativePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link to="/auth" className="inline-flex items-center gap-2 text-primary"><ArrowLeft size={18} /> Voltar</Link>
      <div className="rounded-lg border p-3 text-sm"><span className="font-semibold">Representantes cadastrados: </span><Link to="/representante" className="text-primary underline">Abdenego Eugênio</Link><span className="mx-2">·</span><Link to="/representante-livaldo" className="text-primary underline">Livaldo Souza Silva (teste — Brasil inteiro)</Link></div>
      <section className="surface-card space-y-4 p-5">
        <h1 className="text-2xl font-bold">Representante Comercial</h1>
        <h2 className="text-xl font-semibold">Abdenego Eugênio</h2>
        <p className="text-sm text-muted-foreground">Dados de representação cadastrados pela administração — somente leitura.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Área de atuação</dt><dd className="font-medium">Vale do Paraíba e Litoral Norte de São Paulo</dd></div>
          <div><dt className="text-xs text-muted-foreground">Estado</dt><dd className="font-medium">São Paulo — SP</dd></div>
        </dl>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole size={16} /> Somente o administrador pode alterar este cadastro.</p>
      </section>
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-xl font-bold">Mapa de atuação</h2>
        <p className="text-sm text-muted-foreground">Brasil → São Paulo → municípios atendidos</p>
        <div className="overflow-hidden rounded-xl border">
          <iframe title="Mapa da área de atuação no estado de São Paulo" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[360px] w-full" src="https://www.openstreetmap.org/export/embed.html?bbox=-46.65%2C-24.05%2C-44.65%2C-22.30&layer=mapnik" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {cities.map(city => <div key={city} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{city}</div>)}
        </div>
        <p className="text-xs text-muted-foreground">O mapa mostra a região aproximada. A lista identifica os municípios de atendimento informados no cadastro.</p>
      </section>
    </main>
  );
}
