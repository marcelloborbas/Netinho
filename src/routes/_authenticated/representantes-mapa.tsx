import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, MessageCircle, UserRound, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/representantes-mapa")({
  staticData: { sitemap: false },
  head: () => pageHead("/representantes-mapa", "Representantes pelo Brasil | Netinho Auto Parts", "Localize os representantes Netinho em cada estado."),
  component: RepresentativesMap,
});

type Point = [number, number];
type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Feature = { properties: { name?: string; sigla?: string; id?: string }; geometry: Geometry };
type Representative = { id: string; name: string; uf: string; city: string; region: string; phone: string; photo: string };
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
const photoUrl = (id:string) => supabase.storage.from("person-photos").getPublicUrl(id+"/foto.webp").data.publicUrl;
const digits = (value:string) => value.replace(/\D/g,"");
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
  const [selectedId,setSelectedId]=useState("");
  const [draftSearch,setDraftSearch]=useState("");
  const [search,setSearch]=useState("");
  const [brokenPhotos,setBrokenPhotos]=useState<string[]>([]);
  useEffect(()=>{
    let active=true;
    // Limites estaduais públicos: carregados apenas nesta página, sem aumentar o peso da página inicial.
    fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
      .then(r=>{if(!r.ok)throw Error("Mapa indisponível");return r.json();})
      .then((geo:{features:Feature[]})=>{if(active)setFeatures(geo.features??[]);})
      .catch(()=>{if(active)setMapError(true);});
    return()=>{active=false;};
  },[]);
  const {data:people=[],isLoading,error:peopleError}=useQuery({
    queryKey:["public-representatives-map-v3"],
    staleTime:60_000,
    queryFn:async()=>{
      // RPC retorna apenas dados comerciais autorizados à consulta pública.
      const {data,error}=await supabase.rpc("list_public_representatives" as never);
      if(error)throw error;
      return ((data??[]) as Array<{id:string;full_name:string;uf:string;city:string;region:string;phone:string;photo_id:string}>).map(p=>({
        id:p.id,name:p.full_name,uf:ufFrom(p.uf||""),city:p.city||"",region:p.region||"",phone:p.phone||"",photo:photoUrl(p.photo_id||p.id)
      })) as Representative[];
    },
  });
  const visible=people.filter(p=>!search.trim()||normalize([p.name,p.uf,states[p.uf]?.name,p.city,p.region].join(" ")).includes(normalize(search)));
  const selectedPeople=visible.filter(p=>!selected||p.uf===selected);
  const withoutState=visible.filter(p=>!p.uf);
  const activePerson=people.find(p=>p.id===selectedId);
  const selectState=(uf:string)=>{setSelected(uf);setSelectedId("");};
  const selectPerson=(p:Representative)=>{setSelected(p.uf);setSelectedId(p.id);};
  const labels=Object.entries(states);
  const mapView=selected?stateBounds(features,selected):"0 0 620 590";
  return <main className="mx-auto w-full max-w-[1500px] space-y-3 px-2 pb-28 pt-3 text-[#102a52] sm:px-4">
    <header className="rounded-2xl border-2 border-[#d4af37] bg-[#09254a] p-4 text-center text-white">
      <h1 className="text-xl font-black text-[#ffdc55] sm:text-3xl">REPRESENTANTES</h1>
    </header>
    <form onSubmit={e=>{e.preventDefault();setSearch(draftSearch);setSelected("");setSelectedId("");}} className="flex items-center gap-2 rounded-xl border border-[#d4af37] bg-white px-3"><Search size={19}/><input value={draftSearch} onChange={e=>setDraftSearch(e.target.value)} placeholder="Buscar por nome, cidade ou estado" className="min-h-12 w-full bg-transparent text-sm outline-none"/><button type="submit" aria-label="Procurar representantes" title="Procurar" className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-[#102a52] text-[#ffdc55]"><ArrowRight size={23}/></button></form>
    <section className="relative overflow-hidden rounded-2xl border-[3px] border-[#d4af37] bg-transparent p-1 sm:p-3" aria-label="Mapa dos estados do Brasil">
      <svg viewBox={mapView} className="mx-auto h-[min(78dvh,1050px)] min-h-[440px] w-full transition-all duration-700" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa do Brasil com divisões estaduais, nomes e fotos dos representantes">
        {features.filter(f=>!selected||ufFrom(f.properties.sigla||f.properties.name||"")===selected).map((f,i)=>{
          const uf=ufFrom(f.properties.sigla||f.properties.name||"");
          return <path key={uf||i} d={pathOf(f.geometry)} fill={selected===uf?"#d4af37":"#123b68"} stroke="#e4ba54" strokeWidth="1.2" fillRule="evenodd" className={uf?(selected===uf?"cursor-pointer drop-shadow-[0_0_12px_#ffe083] transition-all duration-500":"cursor-pointer hover:fill-[#286095] transition-all duration-500"):""} style={selected===uf?{filter:"drop-shadow(0 0 8px #ffe083)",strokeWidth:3}:undefined} onClick={()=>uf&&selectState(uf)}><title>{states[uf]?.name||f.properties.name}</title></path>;
        })}
        {labels.filter(([uf])=>!selected||selected===uf).map(([uf,st])=>{const [x,y]=project([st.lon,st.lat]);return <text key={uf} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff3c7" pointerEvents="none">{uf}</text>;})}
        {visible.filter(p=>p.uf&&(!selected||selected===p.uf)).map((p,i)=>{
          const st=states[p.uf];const same=visible.filter(v=>v.uf===p.uf);const idx=same.findIndex(v=>v.id===p.id);
          const [x,y]=project([st.lon,st.lat]);
          const extent=stateExtent(features,p.uf);
          // Distribuição em grade com centros estáveis; a foto fica sempre dentro do pino.
          const columns=Math.min(selected?3:2,same.length);
          const col=idx%columns,row=Math.floor(idx/columns),rows=Math.ceil(same.length/columns);
          const spacingX=selected?31:24,spacingY=selected?43:31;
          const cx=x+(col-(columns-1)/2)*spacingX;
          const cy=y-5+(row-(rows-1)/2)*spacingY;
          const radius=selected?16:13;
          const clip="photo-"+p.id.replace(/[^a-zA-Z0-9]/g,"");
          return <g key={p.id} onClick={()=>selectPerson(p)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectPerson(p);}}} tabIndex={0} className="group cursor-pointer outline-none" role="button" aria-label={"Ver representante "+p.name+" em "+st.name}>
            <title>{p.name} — clique para ver contato e região de atuação</title>
            <defs><clipPath id={clip}><circle cx={cx} cy={cy} r={radius}/></clipPath></defs>
            <circle cx={cx} cy={cy} r={radius+2} fill={selectedId===p.id?"#ffdc55":"#ffffff"} opacity={selectedId===p.id?1:0.12} className="transition-all duration-200 group-hover:opacity-100 group-focus:opacity-100"/>
            <circle cx={cx} cy={cy} r={radius} fill="#173f70"/>
            {!brokenPhotos.includes(p.id)&&<image href={p.photo} x={cx-radius} y={cy-radius} width={radius*2} height={radius*2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} className="origin-center transition-all duration-200 group-hover:brightness-125 group-focus:brightness-125" onError={()=>setBrokenPhotos(v=>v.includes(p.id)?v:[...v,p.id])}/>}
            {brokenPhotos.includes(p.id)&&<text x={cx} y={cy+5} textAnchor="middle" fontSize="15" fill="white">●</text>}
            <circle cx={cx} cy={cy} r={radius+4} fill="transparent" stroke="#ffdc55" strokeWidth="2" className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"/>
          </g>;
        })}
      </svg>
      {!features.length&&<p className="pb-4 text-center text-sm text-white">{mapError?"Não foi possível carregar as divisas estaduais. Consulte os representantes abaixo.":"Carregando divisões dos estados…"}</p>}
      {selected&&<div className="mx-auto my-3 max-w-xl rounded-xl border border-[#ffdc55] bg-[#164c83] p-3 text-center text-white"><h2 className="text-xl font-black text-[#ffdc55]">{states[selected]?.name} — {selected}</h2><p className="text-sm">{selectedPeople.length} representante(s) nesta seleção</p><button type="button" onClick={()=>{setSelected("");setSelectedId("");}} className="mt-2 rounded-lg bg-[#ffdc55] px-4 py-2 text-sm font-bold text-[#102a52]">Voltar ao mapa do Brasil</button></div>}
      {activePerson&&<div className="mx-auto mt-2 flex max-w-xl items-center gap-3 rounded-xl border-2 border-[#ffdc55] bg-[#164c83] p-3 text-white shadow-[0_0_22px_#ffdc5580]"><img src={activePerson.photo} alt="" className="h-16 w-16 rounded-full border-2 border-[#ffdc55] object-cover" onError={e=>{e.currentTarget.style.display="none";}}/><div><strong className="block text-[#ffdc55]">{activePerson.name}</strong><span className="text-sm">{states[activePerson.uf]?.name}{activePerson.city?" · "+activePerson.city:""}</span><p className="text-xs">{activePerson.region|| (activePerson.city?`Cidade-base: ${activePerson.city}. Região atendida não cadastrada.`:"Região atendida não cadastrada.")}</p></div></div>}
      <p className="text-center text-xs text-[#d8e5f4]">Os pinos indicam o estado de atuação, não o endereço pessoal do representante.</p>
    </section>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setSelected("");setSelectedId("");}} className={`rounded-lg px-4 py-2 text-sm font-bold ${!selected?"bg-[#d4af37] text-[#102a52]":"bg-slate-200"}`}>Todo o Brasil</button>{selected&&<span className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold">{states[selected]?.name}</span>}</div>
    <section className="grid gap-3 md:grid-cols-2">
      {isLoading&&<p>Carregando representantes…</p>}
      {!selected&&withoutState.length>0&&<p className="col-span-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{withoutState.length} representante(s) ainda não possuem UF identificada no cadastro. Eles continuam listados abaixo, mas precisam ter o estado de atuação preenchido na Administração para aparecer no mapa.</p>}
      {peopleError&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Não foi possível carregar os representantes. A consulta pública do Supabase pode estar pendente de instalação ou com erro. Detalhes: {peopleError instanceof Error ? peopleError.message : "Falha de consulta"}</p>}
      {!isLoading&&!peopleError&&!selectedPeople.length&&<p className="rounded-xl bg-white p-4 text-sm">Nenhum representante ativo com estado cadastrado para esta seleção.</p>}
      {selectedPeople.map(p=><article key={p.id} onClick={()=>p.uf&&selectPerson(p)} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-4 shadow-sm transition-all ${selectedId===p.id?"border-[#d4af37] ring-4 ring-[#d4af37]/40":"border-[#d4af37]"}`}>
        {!brokenPhotos.includes(p.id)?<img src={p.photo} alt="" onError={()=>setBrokenPhotos(v=>[...v,p.id])} className="h-16 w-16 shrink-0 rounded-full border-2 border-[#d4af37] object-cover"/>:<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200"><UserRound size={30}/></div>}
        <div className="min-w-0 flex-1 break-words"><h2 className="text-base font-black">{p.name}</h2><p className="text-sm">{p.city? p.city+" · ":""}{p.uf||"UF não cadastrada"}</p><p className="text-sm font-semibold">Telefone: {p.phone||"Não informado"}</p><p className="text-xs text-slate-600"><strong>Locais de atuação:</strong> {p.region||"Região atendida não cadastrada"}{p.city&&<span className="block"><strong>Cidade-base:</strong> {p.city}</span>}</p></div>
        {digits(p.phone).length>=10&&<a href={`https://wa.me/${digits(p.phone).startsWith("55")?digits(p.phone):"55"+digits(p.phone)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${p.name}`} className="rounded-full bg-[#137c45] p-3 text-white"><MessageCircle size={22}/></a>}
      </article>)}
    </section>
  </main>;
}
