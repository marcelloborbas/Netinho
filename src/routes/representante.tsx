import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ArrowLeft, LockKeyhole, Pencil } from "lucide-react";

export const Route = createFileRoute("/representante")({
  component: RepresentativePage,
  head: () => ({ meta: [
    { title: "Representante Comercial | Netinho Auto Parts" },
    { name: "description", content: "Conheça a região de atendimento do representante comercial Netinho Auto Parts." },
    { property: "og:title", content: "Representante Comercial | Netinho Auto Parts" },
    { property: "og:description", content: "Conheça a região de atendimento do representante comercial Netinho Auto Parts." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const locations = [
  {
    "name": "São José dos Campos",
    "lat": -23.1896,
    "lon": -45.8841
  },
  {
    "name": "Jacareí",
    "lat": -23.3053,
    "lon": -45.9658
  },
  {
    "name": "Mogi das Cruzes",
    "lat": -23.5228,
    "lon": -46.1883
  },
  {
    "name": "Caçapava",
    "lat": -23.0992,
    "lon": -45.7076
  },
  {
    "name": "Taubaté",
    "lat": -23.0264,
    "lon": -45.5553
  },
  {
    "name": "Pindamonhangaba",
    "lat": -22.9246,
    "lon": -45.4613
  },
  {
    "name": "Guaratinguetá",
    "lat": -22.8166,
    "lon": -45.1924
  },
  {
    "name": "Lorena",
    "lat": -22.7339,
    "lon": -45.1197
  },
  {
    "name": "Cruzeiro",
    "lat": -22.5732,
    "lon": -44.971
  },
  {
    "name": "Caraguatatuba",
    "lat": -23.6203,
    "lon": -45.4131
  },
  {
    "name": "Ubatuba",
    "lat": -23.4332,
    "lon": -45.0834
  },
  {
    "name": "São Sebastião",
    "lat": -23.8067,
    "lon": -45.4027
  }
];
const cities = locations.map((location) => location.name);
function RepresentativePage() {
  const { data: me } = useQuery(meQuery);
  const { data: profile } = useQuery({ queryKey: ["representative-profile", "abdenego-eugenio"], queryFn: async () => { const { data, error } = await supabase.from("representative_profiles" as never).select("full_name,region").eq("slug", "abdenego-eugenio").maybeSingle(); if (error) return null; return data as { full_name: string; region: string } | null; } });
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link to="/auth" className="inline-flex items-center gap-2 text-primary"><ArrowLeft size={18} /> Voltar</Link>
      <div className="rounded-lg border p-3 text-sm"><span className="font-semibold">Representantes cadastrados: </span><Link to="/representante" className="font-bold text-amber-400 underline">Abdenego Eugênio</Link><span className="mx-2">·</span><Link to="/representante-livaldo" className="font-bold text-amber-400 underline">Livaldo Souza Silva (teste — Brasil inteiro)</Link></div>
      <section className="surface-card space-y-4 p-5">
        <h1 className="text-2xl font-bold">Representante Comercial</h1>
        <div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-3xl font-black leading-tight text-amber-400 sm:text-4xl">{profile?.full_name ?? "Abdenego Eugênio"}</h2>{me?.isAdmin && <Link to="/editar-representante/$slug" params={{ slug: "abdenego-eugenio" }} title="Editar representante (somente administrador)" aria-label="Editar cadastro de Abdenego Eugênio" className="rounded-lg border border-amber-400/50 p-2 text-amber-400 hover:bg-amber-400/10"><Pencil className="h-5 w-5" /></Link>}</div>
        <p className="text-sm text-muted-foreground">Dados de representação cadastrados pela administração — somente leitura.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Área de atuação</dt><dd className="font-medium">{profile?.region ?? "Vale do Paraíba e Litoral Norte de São Paulo"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Estado</dt><dd className="font-medium">São Paulo — SP</dd></div>
        </dl>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole size={16} /> Somente o administrador pode alterar este cadastro.</p>
      </section>
      <section className="surface-card space-y-4 p-5">
        <h2 className="text-xl font-bold">Mapa de atuação</h2>
        <p className="text-sm text-muted-foreground">Brasil → São Paulo → municípios atendidos</p>
        <div className="overflow-hidden rounded-xl border bg-white"><img src="/Mapa%20Infogr%C3%A1fico%20dos%20Munic%C3%ADpios%20Paulistas%20Abdnego.webp" alt="Mapa de São Paulo com marcações vermelhas dos municípios de atuação de Abdenego Eugênio" className="block h-auto w-full" loading="lazy" /></div>
        <div className="grid gap-2 sm:grid-cols-3">
          {cities.map(city => <div key={city} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{city}</div>)}
        </div>
        <p className="text-xs text-muted-foreground">Os pinos vermelhos identificam a localização aproximada do centro de cada município atendido. Os nomes estão relacionados abaixo do mapa.</p>
      </section>
    </main>
  );
}
