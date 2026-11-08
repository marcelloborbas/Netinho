import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";
import { meQuery } from "@/lib/queries";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/representantes-mapa")({
  staticData: { sitemap: false },
  head: () => pageHead("/representantes-mapa", "Representantes pelo Brasil | Netinho Auto Parts", "Localize os representantes Netinho em cada estado."),
  component: RepresentativesMap,
});

type Point = [number, number];
type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Feature = { properties: { name?: string; sigla?: string; id?: string }; geometry: Geometry };
type Representative = { id: string; name: string; uf: string; city: string; region: string };
const states: Record<string, { name: string; lon: number; lat: number }> = {
  AC:{name:"Acre",lon:-70.4,lat:-9.0},AL:{name:"Alagoas",lon:-36.6,lat:-9.6},AP:{name:"Amapá",lon:-51.8,lat:1.5},
  AM:{name:"Amazonas",lon:-64.5,lat:-4.1},BA:{name:"Bahia",lon:-41.7,lat:-12.8},CE:{name:"Ceará",lon:-39.5,lat:-5.2},
  DF:{name:"Distrito Federal",lon:-47.9,lat:-15.8},ES:{name:"Espírito Santo",lon:-40.5,lat:-19.6},GO:{name:"Goiás",lon:-49.4,lat:-16.0},
  MA:{name:"Maranhão",lon:-45.1,lat:-5.1},MT:{name:"Mato Grosso",lon:-56.1,lat:-12.8},MS:{name:"Mato Grosso do Sul",lon:-54.5,lat:-20.7},
  MG:{name:"Minas Gerais",lon:-44.4,lat:-18.7},PA:{name:"Pará",lon:-52.4,lat:-4.1},PB:{name:"Paraíba",lon:-36.8,lat:-7.1},
  PR:{name:"Paraná",lon:-51.6,lat:-24.8},PE:{name:"Pernambuco",lon:-38.5,lat:-8.4},PI:{name:"Piauí",lon:-42.8,lat:-7.3},
  RJ:{name:"Rio de Janeiro",lon:-42.6,lat:-22.3},RN:{name:"Rio Grande do Norte",lon:-36.5,lat:-5.8},RS:{name:"Rio Grande do Sul",lon:-53.2,lat:-30.1},
  RO:{name:"Rondônia",lon:-63.4,lat:-10.9},RR:{name:"Roraima",lon:-61.3,lat:2.1},SC:{name:"Santa Catarina",lon:-50.7,lat:-27.2},
  SP:{name:"São Paulo",lon:-48.7,lat:-22.4},SE:{name:"Sergipe",lon:-37.4,lat:-10.6},TO:{name:"Tocantins",lon:-48.3,lat:-10.1},
};
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const ufFrom = (value: string) => Object.keys(states).find(k => k === value.trim().toUpperCase() || normalize(states[k].name) === normalize(value)) ?? "";
const project = ([lon,lat]:Point):Point => [(lon+75)*14, (6-lat)*14];
const rings = (g:Geometry):number[][][] => g.type === "Polygon" ? g.coordinates as number[][][] : (g.coordinates as number[][][][]).flat();
const pathOf = (g:Geometry) => rings(g).map(r=>r.map((p,i)=>{const [x,y]=project(p as Point);return (i?"L":"M")+x.toFixed(1)+","+y.toFixed(1);}).join(" ")+"Z").join(" ");
const stateExtent = (features:Feature[],uf:string) => {
  const feature=features.find(f=>ufFrom(f.properties.sigla||f.properties.name||"")===uf);
  if(!feature)return null;
  const pts=rings(feature.geometry).flat().map(p=>project(p as Point));
  if(!pts.length)return null;
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
};
const stateBounds = (features:Feature[],uf:string) => {
  const extent=stateExtent(features,uf);
  if(!extent)return "0 0 620 590";
  const {minX,maxX,minY,maxY}=extent;
  const pad=Math.max(22,Math.max(maxX-minX,maxY-minY)*0.15);
  return [minX-pad,minY-pad,Math.max(90,maxX-minX+pad*2),Math.max(90,maxY-minY+pad*2)].join(" ");
};
function RepresentativesMap(){
  const [features,setFeatures]=useState<Feature[]>([]);
  const [mapError,setMapError]=useState(false);
  const [selected,setSelected]=useState("");
  const [draftSearch,setDraftSearch]=useState("");
  const [search,setSearch]=useState("");
  useEffect(()=>{
    let active=true;
    // Limites estaduais públicos: carregados apenas nesta página, sem aumentar o peso da página inicial.
    fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
      .then(r=>{if(!r.ok)throw Error("Mapa indisponível");return r.json();})
      .then((geo:{features:Feature[]})=>{if(active)setFeatures(geo.features??[]);})
      .catch(()=>{if(active)setMapError(true);});
    return()=>{active=false;};
  },[]);
  const {data:me}=useQuery(meQuery);
  const {data:people=[],isLoading,error:peopleError}=useQuery({
    queryKey:["public-representatives-map-v3"],
    staleTime:60_000,
    queryFn:async()=>{
      // RPC retorna apenas dados comerciais autorizados à consulta pública.
      const {data,error}=await supabase.rpc("list_public_representatives" as never);
      if(error)throw error;
      return ((data??[]) as Array<{id:string;full_name:string;uf:string;city:string;region:string;phone:string;photo_id:string}>).map(p=>({
        id:p.id,name:p.full_name,uf:ufFrom(p.uf||""),city:p.city||"",region:p.region||""
      })) as Representative[];
    },
  });
  const visible=people.filter(p=>!search.trim()||normalize([p.name,p.uf,states[p.uf]?.name,p.city,p.region].join(" ")).includes(normalize(search)));
  const selectedPeople=visible.filter(p=>!selected||p.uf===selected);
  const withoutState=visible.filter(p=>!p.uf);
  const selectState=(uf:string)=>{setSelected(uf);};
  const labels=Object.entries(states);
  const mapView=selected?stateBounds(features,selected):"0 0 620 590";
  return <main className="mx-auto w-full max-w-[1500px] space-y-3 px-2 pb-28 pt-3 text-[#102a52] sm:px-4">
    <header className="rounded-2xl border-2 border-[#d4af37] bg-[#09254a] p-4 text-center text-white">
      <h1 className="text-xl font-black text-[#ffdc55] sm:text-3xl">REPRESENTANTES</h1>
    </header>
    <form onSubmit={e=>{e.preventDefault();setSearch(draftSearch);setSelected("");}} className="flex items-center gap-2 rounded-xl border border-[#d4af37] bg-white px-3"><Search size={19}/><input value={draftSearch} onChange={e=>setDraftSearch(e.target.value)} placeholder="Buscar por nome, cidade ou estado" className="min-h-12 w-full bg-transparent text-sm outline-none"/><button type="submit" aria-label="Procurar representantes" title="Procurar" className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-[#102a52] text-[#ffdc55]"><ArrowRight size={23}/></button></form>
    <section className="relative overflow-hidden rounded-2xl border-[3px] border-[#d4af37] bg-transparent p-1 sm:p-3" aria-label="Mapa dos estados do Brasil">
      <svg viewBox={mapView} className="mx-auto h-[min(78dvh,1050px)] min-h-[440px] w-full transition-all duration-700" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa do Brasil com divisões estaduais. Selecione um estado para consultar os representantes na lista abaixo">
        {features.filter(f=>!selected||ufFrom(f.properties.sigla||f.properties.name||"")===selected).map((f,i)=>{
          const uf=ufFrom(f.properties.sigla||f.properties.name||"");
          return <path key={uf||i} d={pathOf(f.geometry)} fill={selected===uf?"#d4af37":"#123b68"} stroke="#e4ba54" strokeWidth="1.2" fillRule="evenodd" className={uf?(selected===uf?"cursor-pointer drop-shadow-[0_0_12px_#ffe083] transition-all duration-500":"cursor-pointer hover:fill-[#286095] transition-all duration-500"):""} style={selected===uf?{filter:"drop-shadow(0 0 8px #ffe083)",strokeWidth:3}:undefined} onClick={()=>uf&&selectState(uf)}><title>{states[uf]?.name||f.properties.name}</title></path>;
        })}
        {labels.filter(([uf])=>!selected||selected===uf).map(([uf,st])=>{const [x,y]=project([st.lon,st.lat]);return <text key={uf} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff3c7" pointerEvents="none">{uf}</text>;})}
      </svg>
      {!features.length&&<p className="pb-4 text-center text-sm text-white">{mapError?"Não foi possível carregar as divisas estaduais. Consulte os representantes abaixo.":"Carregando divisões dos estados…"}</p>}
      {selected&&<div className="mx-auto my-3 max-w-xl rounded-xl border border-[#ffdc55] bg-[#164c83] p-3 text-center text-white"><h2 className="text-xl font-black text-[#ffdc55]">{states[selected]?.name} — {selected}</h2><p className="text-sm">{selectedPeople.length} representante(s) nesta seleção</p><button type="button" onClick={()=>{setSelected("");setSelectedId("");}} className="mt-2 rounded-lg bg-[#ffdc55] px-4 py-2 text-sm font-bold text-[#102a52]">Voltar ao mapa do Brasil</button></div>}
    </section>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setSelected("");setSelectedId("");}} className={`rounded-lg px-4 py-2 text-sm font-bold ${!selected?"bg-[#d4af37] text-[#102a52]":"bg-slate-200"}`}>Todo o Brasil</button>{selected&&<span className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold">{states[selected]?.name}</span>}</div>
    <section className="grid gap-3 md:grid-cols-2">
      {isLoading&&<p>Carregando representantes…</p>}
      {!selected&&withoutState.length>0&&<p className="col-span-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{withoutState.length} representante(s) ainda não possuem UF identificada no cadastro. Eles continuam listados abaixo, mas precisam ter o estado de atuação preenchido na Administração para aparecer no mapa.</p>}
      {peopleError&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Não foi possível carregar os representantes. A consulta pública do Supabase pode estar pendente de instalação ou com erro. Detalhes: {peopleError instanceof Error ? peopleError.message : "Falha de consulta"}</p>}
      {!isLoading&&!peopleError&&!selectedPeople.length&&<p className="rounded-xl bg-white p-4 text-sm">Nenhum representante ativo com estado cadastrado para esta seleção.</p>}
      {selectedPeople.map(p=><article key={p.id} className="rounded-xl border-2 border-[#d4af37] bg-white p-4 shadow-sm">
        <h2 className="text-base font-black">{p.name}</h2>
        <p className="mt-1 text-sm text-slate-600"><strong>Locais de atendimento:</strong> {p.region||p.city||"Ainda não cadastrados"}{p.city&&p.region&&<span className="block">Cidade-base: {p.city}</span>}{p.uf&&<span className="block">Estado: {states[p.uf]?.name||p.uf}</span>}</p>
        </div>\n      </article>)}
    </section>
  </main>;
}
