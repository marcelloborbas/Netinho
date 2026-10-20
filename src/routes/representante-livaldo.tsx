import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, Pencil } from "lucide-react";
import { BrandPageLayout } from "@/components/BrandPageLayout";
import { ExpandableMap } from "@/components/ExpandableMap";

export const Route = createFileRoute("/representante-livaldo")({
  component: LivaldoPage,
  head: () => ({ meta: [
    { title: "Livaldo Souza Silva — Representante Comercial | Netinho" },
    { name: "description", content: "Consulte a representação comercial de Livaldo Souza Silva e sua área de atuação em Sorocaba e região pela Netinho." },
    { property: "og:title", content: "Livaldo Souza Silva — Representante Comercial | Netinho" },
    { property: "og:description", content: "Consulte a representação comercial de Livaldo Souza Silva e sua atuação em Sorocaba e região pela Netinho." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const cities = [{"name":"Sorocaba","x":475,"y":285},{"name":"Votorantim","x":466,"y":349},{"name":"Araçoiaba da Serra","x":389,"y":319},{"name":"Alumínio","x":543,"y":316},{"name":"Mairinque","x":549,"y":285},{"name":"São Roque","x":614,"y":324},{"name":"Ibiúna","x":577,"y":434},{"name":"Piedade","x":469,"y":437},{"name":"Salto","x":526,"y":167},{"name":"Itu","x":531,"y":218},{"name":"Porto Feliz","x":447,"y":188},{"name":"Boituva","x":372,"y":238},{"name":"Tatuí","x":304,"y":242},{"name":"Cerquilho","x":359,"y":167},{"name":"Tietê","x":349,"y":113},{"name":"Jumirim","x":337,"y":129},{"name":"Capela do Alto","x":350,"y":285},{"name":"Iperó","x":376,"y":266},{"name":"Salto de Pirapora","x":414,"y":372},{"name":"Pilar do Sul","x":357,"y":473},{"name":"São Miguel Arcanjo","x":249,"y":491},{"name":"Tapiraí","x":417,"y":530},{"name":"Itapetininga","x":178,"y":373},{"name":"Alambari","x":300,"y":327},{"name":"Sarapuí","x":331,"y":377},{"name":"Cesário Lange","x":286,"y":175}];
function SorocabaMap() {
  return <div className="space-y-3">
    <div className="relative mx-auto w-full max-w-4xl">
      <ExpandableMap focus="sorocaba" src="/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png" alt="Mapa de atuação de Livaldo em Sorocaba e região" />
      <svg viewBox="0 0 850 606" className="hidden" preserveAspectRatio="none" role="img" aria-label="Pontos vermelhos nas cidades atendidas">
        {cities.map(city => <circle key={city.name} cx={city.x} cy={city.y} r="5" fill="#dc2626" stroke="white" strokeWidth="1.6"><title>{city.name}</title></circle>)}
      </svg>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cities.map(city => <div key={city.name} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><span className="h-3 w-3 shrink-0 rounded-full bg-red-600" />{city.name}</div>)}
    </div>
    <p className="text-xs text-muted-foreground">Pontos vermelhos aproximados na região de Sorocaba. Municípios atendidos relacionados abaixo.</p>
  </div>;
}

function LivaldoPage() {
  const { data: me } = useQuery(meQuery);
  const { data: profile } = useQuery({ queryKey: ["representative-profile", "livaldo-souza-silva"], queryFn: async () => { const { data, error } = await supabase.from("representative_profiles" as never).select("full_name,region").eq("slug", "livaldo-souza-silva").maybeSingle(); if (error) return null; return data as { full_name: string; region: string } | null; } });
  const { data: authorization, isPending: checkingAuthorization, isError: authorizationError } = useQuery({
    queryKey: ["representative-authorization", "Livaldo Souza Silva"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_representatives" as never)
        .select("active")
        .eq("full_name", "Livaldo Souza Silva")
        .maybeSingle();
      if (error) throw error;
      return data as { active: boolean } | null;
    },
  });
  const authorizationLabel = checkingAuthorization ? "Verificando autorização" : authorizationError ? "Status indisponível" : authorization?.active ? "Autorizado" : "Não autorizado";
  const authorizationColor = authorizationError || checkingAuthorization ? "bg-slate-500/15 text-slate-600" : authorization?.active ? "bg-green-600 text-white" : "bg-red-600 text-white";
  return (
    <BrandPageLayout><main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <Link to="/auth" className="inline-flex items-center gap-2 text-primary"><ArrowLeft size={18} /> Voltar</Link>
      <section className="surface-card space-y-3 p-5">
        <h1 className="text-2xl font-bold">Representante Comercial</h1>
        <div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-3xl font-black leading-tight text-amber-400 sm:text-4xl">{profile?.full_name ?? "Livaldo Souza Silva"}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${authorizationColor}`}>{authorizationLabel}</span>{me?.isAdmin && <Link to="/editar-representante/$slug" params={{ slug: "livaldo-souza-silva" }} title="Editar representante (somente administrador)" aria-label="Editar cadastro de Livaldo Souza Silva" className="rounded-lg border border-amber-400/50 p-2 text-amber-400 hover:bg-amber-400/10"><Pencil className="h-5 w-5" /></Link>}</div>
        <p className="text-sm font-semibold text-primary">Cadastro de teste</p>
        <p><span className="text-muted-foreground">Área de representação:</span> {profile?.region ?? "Sorocaba e região — DDD 015"}</p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole size={16} /> Dados somente para visualização. Alterações exclusivas da administração.</p>
      </section>
      <section className="surface-card space-y-3 p-5">
        <h2 className="text-xl font-bold">Mapa da área de atuação</h2>
        <SorocabaMap />
      </section>
      <p className="text-xs text-muted-foreground">Este perfil é demonstrativo e não concede acesso a preços, estoque ou pedidos.</p>
    </main></BrandPageLayout>
  );
}
