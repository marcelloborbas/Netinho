import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transportadoras")({
  head: () => ({ meta: [{ title: "Transportadoras – NETINHO" }] }),
  component: TransportadorasPage,
});

const cities = ["Mogi das Cruzes - SP", "São José dos Campos - SP", "Jacareí - SP", "Guaratinguetá - SP"];
const transportadoras = [
  { name: "JTO TRANSPORTES", cities },
  { name: "ANDORINHA TRANSPORTES", cities },
];

function TransportadorasPage() {
  return <main className="mx-auto max-w-4xl space-y-6 pb-12">
    <Link to="/admin" className="inline-flex items-center gap-2 text-amber-300"><ArrowLeft size={18}/> Administração</Link>
    <header className="rounded-2xl border-2 border-amber-400/70 bg-[#102a52] px-6 py-5 text-center shadow-lg">
      <h1 className="text-2xl font-extrabold uppercase tracking-wide text-amber-300 sm:text-3xl">Transportadoras</h1>
    </header>
    <div className="grid gap-5 md:grid-cols-2">
      {transportadoras.map(item => <section key={item.name} className="surface-card space-y-4 rounded-xl border p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Truck className="shrink-0 text-amber-300" size={25}/>{item.name}</h2>
        <p className="text-sm text-muted-foreground">Cidades informadas para atendimento:</p>
        <ul className="space-y-3">{item.cities.map(city => <li key={city} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><span>{city}</span><CheckCircle2 size={22} className="shrink-0 text-emerald-400" aria-label="Atendimento informado"/></li>)}</ul>
      </section>)}
    </div>
  </main>;
}
