import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, Pencil } from "lucide-react";

export const Route = createFileRoute("/representante-livaldo")({
  component: LivaldoPage,
  head: () => ({ meta: [
    { title: "Livaldo Souza Silva — Representante Comercial | Netinho" },
    { name: "description", content: "Consulte a representação comercial de Livaldo Souza Silva e sua cobertura nacional pela Netinho." },
    { property: "og:title", content: "Livaldo Souza Silva — Representante Comercial | Netinho" },
    { property: "og:description", content: "Consulte a representação comercial de Livaldo Souza Silva e sua cobertura nacional pela Netinho." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type PolygonCoordinates = number[][][];
type BrazilGeometry = { type: "Polygon" | "MultiPolygon"; coordinates: PolygonCoordinates | PolygonCoordinates[] };
const geojsonUrl = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
const width = 680;
const height = 610;
const project = (coordinate: number[]): [number, number] => {
  const [lon = 0, lat = 0] = coordinate;
  return [((lon + 75) / 43) * width, ((7 - lat) / 42) * height];
};
function ringsToPath(rings: PolygonCoordinates) {
  return rings.map(ring => ring.map((point, index) => {
    const [x, y] = project(point);
    return (index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
  }).join(" ") + " Z").join(" ");
}

function BrazilMap() {
  const [paths, setPaths] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(geojsonUrl, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Mapa indisponível"); return response.json(); })
      .then(data => {
        const feature = data.features?.find((item: { properties?: Record<string, string> }) =>
          item.properties?.["name"] === "Brazil" || item.properties?.["ADMIN"] === "Brazil" || item.properties?.["name"] === "Brasil");
        if (!feature?.geometry) throw new Error("Brasil não encontrado");
        const geometry = feature.geometry as BrazilGeometry;
        setPaths(geometry.type === "Polygon"
          ? [ringsToPath(geometry.coordinates as PolygonCoordinates)]
          : (geometry.coordinates as PolygonCoordinates[]).map(ringsToPath));
      })
      .catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);
  return (
    <div className="rounded-xl border bg-sky-50 p-3 text-slate-900">
      {failed ? <p className="p-6 text-center text-sm">Não foi possível carregar os limites do Brasil. Verifique a conexão.</p> :
        <svg viewBox="0 0 680 610" className="mx-auto w-full max-w-2xl" role="img" aria-label="Mapa do Brasil com área nacional de representação destacada em vermelho">
          {paths.length ? <>{paths.map((path, i) => <path key={i} d={path} fill="#fee2e2" stroke="#dc2626" strokeWidth="3" strokeLinejoin="round" fillRule="evenodd" />)}<g transform="translate(350 305)"><circle r="12" fill="#dc2626" stroke="white" strokeWidth="4" /><path d="M0 0 L-8 -16 A11 11 0 1 1 8 -16 Z" fill="#dc2626" stroke="white" strokeWidth="2" /><text x="0" y="38" textAnchor="middle" fontSize="19" fontWeight="bold" fill="#991b1b">TODO O BRASIL</text></g></> :
            <text x="340" y="300" textAnchor="middle" fontSize="20" fill="#1e40af">Carregando mapa do Brasil...</text>}
        </svg>}
      <p className="text-center text-xs text-slate-600">Área vermelha: cobertura nacional do representante · Brasil inteiro</p>
    </div>
  );
}

function LivaldoPage() {
  const { data: me } = useQuery(meQuery);
  const { data: profile } = useQuery({ queryKey: ["representative-profile", "livaldo-souza-silva"], queryFn: async () => { const { data, error } = await supabase.from("representative_profiles" as never).select("full_name,region").eq("slug", "livaldo-souza-silva").maybeSingle(); if (error) return null; return data as { full_name: string; region: string } | null; } });
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link to="/auth" className="inline-flex items-center gap-2 text-primary"><ArrowLeft size={18} /> Voltar</Link>
      <section className="surface-card space-y-3 p-5">
        <h1 className="text-2xl font-bold">Representante Comercial</h1>
        <div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-3xl font-black leading-tight text-amber-400 sm:text-4xl">{profile?.full_name ?? "Livaldo Souza Silva"}</h2>{me?.isAdmin && <Link to="/editar-representante/$slug" params={{ slug: "livaldo-souza-silva" }} title="Editar representante (somente administrador)" aria-label="Editar cadastro de Livaldo Souza Silva" className="rounded-lg border border-amber-400/50 p-2 text-amber-400 hover:bg-amber-400/10"><Pencil className="h-5 w-5" /></Link>}</div>
        <p className="text-sm font-semibold text-primary">Cadastro de teste</p>
        <p><span className="text-muted-foreground">Área de representação:</span> {profile?.region ?? "Todo o Brasil — todos os estados e o Distrito Federal"}</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole size={16} /> Dados somente para visualização. Alterações exclusivas da administração.</p>
      </section>
      <section className="surface-card space-y-3 p-5">
        <h2 className="text-xl font-bold">Mapa da área de atuação</h2>
        <BrazilMap />
      </section>
      <p className="text-xs text-muted-foreground">Este perfil é demonstrativo e não concede acesso a preços, estoque ou pedidos.</p>
    </main>
  );
}
