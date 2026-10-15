import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, ArrowLeft, LockKeyhole, Pencil } from "lucide-react";

export const Route = createFileRoute("/representante")({
  component: RepresentativePage,
  head: () => ({ meta: [{ title: "Representante Comercial | Netinho Auto Parts" }] }),
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
const mapX = (lon: number) => 28 + ((lon + 53.2) / 9.2) * 840;
const mapY = (lat: number) => 20 + ((-19.7 - lat) / 5.8) * 510;
// Contorno ilustrativo do estado, com posições geográficas aproximadas dos municípios.
const outline: [number,number][] = [[-53.1,-22.55],[-52.7,-22.45],[-52,-22.5],[-51.4,-22.1],[-51,-21.6],[-50.5,-21.25],[-50,-20.75],[-49.5,-20.45],[-48.7,-20.2],[-48,-20],[-47.6,-20.45],[-47.1,-20.85],[-46.8,-21.25],[-46.5,-21.8],[-46,-22.3],[-45.5,-22.6],[-45,-22.55],[-44.5,-22.75],[-44.4,-23],[-44.7,-23.35],[-45.1,-23.65],[-45.4,-23.85],[-46,-24.05],[-46.5,-24.25],[-47.2,-24.55],[-48,-25],[-48.8,-25.2],[-49.4,-24.9],[-50,-24.45],[-50.6,-24],[-51.3,-23.65],[-52,-23.2],[-52.7,-22.9]];
const outlinePath = outline.map(([lon,lat],i) => (i ? "L" : "M") + mapX(lon).toFixed(1) + " " + mapY(lat).toFixed(1)).join(" ") + " Z";
function StaticTerritoryMap() {
  return <div className="rounded-xl border bg-[#eaf2f8] p-2 sm:p-4">
    <svg viewBox="0 0 920 580" className="w-full" role="img" aria-label="Mapa fixo ilustrativo de São Paulo com 12 marcadores vermelhos nas cidades atendidas">
      <rect width="920" height="580" rx="16" fill="#eaf2f8" />
      <path d={outlinePath} fill="#c8d9c8" stroke="#527a62" strokeWidth="3" strokeLinejoin="round" />
      <text x="185" y="245" fill="#4b6b5a" fontSize="30" fontWeight="700">SÃO PAULO</text>
      <text x="185" y="271" fill="#527a62" fontSize="15">Estado de São Paulo · mapa esquemático</text>
      {locations.map((city, i) => { const x = mapX(city.lon), y = mapY(city.lat); return <g key={city.name}>
        <circle cx={x} cy={y - 12} r="12" fill="#e11d28" stroke="white" strokeWidth="3" />
        <circle cx={x} cy={y - 12} r="4" fill="white" />
        <path d={"M " + (x - 8) + " " + (y - 4) + " L " + x + " " + (y + 9) + " L " + (x + 8) + " " + (y - 4)} fill="#e11d28" stroke="white" strokeWidth="1.5" />
        <title>{(i + 1) + ". " + city.name}</title>
      </g>; })}
      <rect x="22" y="522" width="470" height="42" rx="10" fill="white" opacity="0.94" />
      <circle cx="43" cy="543" r="7" fill="#e11d28" />
      <text x="59" y="549" fontSize="18" fill="#283846" fontWeight="600">12 municípios de representação comercial</text>
    </svg>
    <p className="mt-2 text-center text-xs text-slate-600">Mapa fixo ilustrativo, sem serviços externos. Marcadores em posições aproximadas.</p>
  </div>;
}

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
        <StaticTerritoryMap />
        <div className="grid gap-2 sm:grid-cols-3">
          {cities.map(city => <div key={city} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{city}</div>)}
        </div>
        <p className="text-xs text-muted-foreground">Os pinos vermelhos identificam a localização aproximada do centro de cada município atendido. Os nomes estão relacionados abaixo do mapa.</p>
      </section>
    </main>
  );
}
