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
    queryKey:["public-representatives-map-v2"],
    staleTime:60_000,
    queryFn:async()=>{
      // A Administração mantém pessoas e representantes comerciais em cadastros distintos.
      // Consultar ambos sem trazer CPF, RG, endereço residencial ou comissões.
      const [profileResult,commercialResult,repProfileResult]=await Promise.all([
        supabase.from("profiles").select("id,full_name,email,site_role,access_active,territory_uf,territory_cities,phone").eq("site_role","Representante").eq("access_active",true),
        supabase.from("commercial_representatives").select("id,full_name,email,active").eq("active",true),
        supabase.from("representative_profiles").select("slug,full_name,email,phone,region"),
      ]);
      if(profileResult.error)throw profileResult.error;
      const profiles=(profileResult.data??[]) as Array<{id:string;full_name:string|null;email:string|null;territory_uf:string|null;territory_cities:string|null;phone:string|null}>;
      const commercial=(commercialResult.data??[]) as Array<{id:string;full_name:string;email:string;active:boolean}>;
      const repProfiles=(repProfileResult.data??[]) as Array<{slug:string;full_name:string;email:string;phone:string|null;region:string|null}>;
      const ids=profiles.map(p=>p.id);
      const [territoryResult,commercialDetailResult,repDetailResult]=await Promise.all([
        ids.length?supabase.from("person_territories" as never).select("user_id,city_base,region").in("user_id",ids):Promise.resolve({data:[]}),
        commercial.length?supabase.from("commercial_representative_details" as never).select("representative_id,city,state,region,service_cities,phone").in("representative_id",commercial.map(p=>p.id)):Promise.resolve({data:[]}),
        repProfiles.length?supabase.from("representative_private_details").select("slug,city,state,service_cities").in("slug",repProfiles.map(p=>p.slug)):Promise.resolve({data:[]}),
      ]);
      const territoryById=new Map(((territoryResult.data??[]) as Array<{user_id:string;city_base:string|null;region:string|null}>).map(t=>[t.user_id,t]));
      const commercialById=new Map(((commercialDetailResult.data??[]) as Array<{representative_id:string;city:string|null;state:string|null;region:string|null;service_cities:string|null;phone:string|null}>).map(t=>[t.representative_id,t]));
      const repBySlug=new Map(((repDetailResult.data??[]) as Array<{slug:string;city:string|null;state:string|null;service_cities:string|null}>).map(t=>[t.slug,t]));
      const byEmail=(email:string|null|undefined)=>repProfiles.find(p=>email&&normalize(p.email)===normalize(email));
      const rows:Representative[]=[];
      for(const p of profiles){
        const territory=territoryById.get(p.id);
        const rp=byEmail(p.email);const detail=rp?repBySlug.get(rp.slug):undefined;
        rows.push({id:p.id,name:p.full_name||rp?.full_name||"Representante",uf:ufFrom(p.territory_uf||detail?.state||""),city:territory?.city_base||detail?.city||"",region:territory?.region||p.territory_cities||detail?.service_cities||rp?.region||"",phone:p.phone||rp?.phone||"",photo:photoUrl(p.id)});
      }
      for(const p of commercial){
        if(rows.some(r=>normalize(r.name)===normalize(p.full_name)))continue;
        const d=commercialById.get(p.id);const rp=byEmail(p.email);const rd=rp?repBySlug.get(rp.slug):undefined;
        rows.push({id:p.id,name:p.full_name,uf:ufFrom(d?.state||rd?.state||""),city:d?.city||rd?.city||"",region:d?.region||d?.service_cities||rd?.service_cities||rp?.region||"",phone:d?.phone||rp?.phone||"",photo:photoUrl(p.id)});
      }
      return rows;
    },
  });
  const visible=people.filter(p=>!search.trim()||normalize([p.name,p.uf,states[p.uf]?.name,p.city,p.region].join(" ")).includes(normalize(search)));
  const selectedPeople=visible.filter(p=>!selected||p.uf===selected);
  const activePerson=people.find(p=>p.id===selectedId);
  const selectState=(uf:string)=>{setSelected(v=>v===uf?"":uf);setSelectedId("");};
  const selectPerson=(p:Representative)=>{setSelected(p.uf);setSelectedId(p.id);};
  const labels=Object.entries(states);
  return <main className="mx-auto w-full max-w-[1500px] space-y-3 px-2 pb-28 pt-3 text-[#102a52] sm:px-4">
    <header className="rounded-2xl border-2 border-[#d4af37] bg-[#09254a] p-4 text-center text-white">
      <h1 className="text-xl font-black text-[#ffdc55] sm:text-3xl">REPRESENTANTES</h1>
    </header>
    <form onSubmit={e=>{e.preventDefault();setSearch(draftSearch);setSelected("");setSelectedId("");}} className="flex items-center gap-2 rounded-xl border border-[#d4af37] bg-white px-3"><Search size={19}/><input value={draftSearch} onChange={e=>setDraftSearch(e.target.value)} placeholder="Buscar por nome, cidade ou estado" className="min-h-12 w-full bg-transparent text-sm outline-none"/><button type="submit" aria-label="Procurar representantes" title="Procurar" className="flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-[#102a52] text-[#ffdc55]"><ArrowRight size={23}/></button></form>
    <section className="relative overflow-hidden rounded-2xl border-[3px] border-[#d4af37] bg-[#071d3a] p-1 sm:p-3" aria-label="Mapa dos estados do Brasil">
      <svg viewBox="0 0 620 590" className="mx-auto h-[min(78dvh,1050px)] min-h-[440px] w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa do Brasil com divisões estaduais, nomes e fotos dos representantes">
        {features.map((f,i)=>{
          const uf=ufFrom(f.properties.sigla||f.properties.name||"");
          return <path key={uf||i} d={pathOf(f.geometry)} fill={selected===uf?"#d4af37":"#123b68"} stroke="#e4ba54" strokeWidth="1.2" fillRule="evenodd" className={uf?(selected===uf?"cursor-pointer drop-shadow-[0_0_12px_#ffe083] transition-all duration-500":"cursor-pointer hover:fill-[#286095] transition-all duration-500"):""} style={selected===uf?{filter:"drop-shadow(0 0 8px #ffe083)",strokeWidth:3}:undefined} onClick={()=>uf&&selectState(uf)}><title>{states[uf]?.name||f.properties.name}</title></path>;
        })}
        {labels.map(([uf,st])=>{const [x,y]=project([st.lon,st.lat]);return <text key={uf} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff3c7" pointerEvents="none">{uf}</text>;})}
        {visible.filter(p=>p.uf).map((p,i)=>{
          const st=states[p.uf];const same=visible.filter(v=>v.uf===p.uf);const idx=same.findIndex(v=>v.id===p.id);
          const [x,y]=project([st.lon,st.lat]);const offsetX=(idx%4-1.5)*27,offsetY=Math.floor(idx/4)*30-24;
          const cx=x+offsetX,cy=y+offsetY;const clip="photo-"+p.id.replace(/[^a-zA-Z0-9]/g,"");
          return <g key={p.id} onClick={()=>selectPerson(p)} className={selectedId===p.id?"cursor-pointer drop-shadow-[0_0_12px_#ffe083]":"cursor-pointer"} role="button" aria-label={p.name+" - "+st.name}>
            <title>{p.name} - {st.name}</title>
            <path d={`M${cx} ${cy+18}l-9 -15a13 13 0 1 1 18 0z`} fill={selectedId===p.id?"#ffffff":"#e7b63d"} stroke="#071d3a" strokeWidth="1.5"/>
            <defs><clipPath id={clip}><circle cx={cx} cy={cy-3} r="10"/></clipPath></defs>
            <circle cx={cx} cy={cy-3} r="12" fill="#ffffff"/>
            {!brokenPhotos.includes(p.id)&&<image href={p.photo} x={cx-10} y={cy-13} width="20" height="20" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} onError={()=>setBrokenPhotos(v=>[...v,p.id])}/>}
            {brokenPhotos.includes(p.id)&&<circle cx={cx} cy={cy-3} r="10" fill="#173f70"/>}
          </g>;
        })}
      </svg>
      {!features.length&&<p className="pb-4 text-center text-sm text-white">{mapError?"Não foi possível carregar as divisas estaduais. Consulte os representantes abaixo.":"Carregando divisões dos estados…"}</p>}
      {activePerson&&<div className="mx-auto mt-2 flex max-w-xl items-center gap-3 rounded-xl border-2 border-[#ffdc55] bg-[#164c83] p-3 text-white shadow-[0_0_22px_#ffdc5580]"><img src={activePerson.photo} alt="" className="h-16 w-16 rounded-full border-2 border-[#ffdc55] object-cover" onError={e=>{e.currentTarget.style.display="none";}}/><div><strong className="block text-[#ffdc55]">{activePerson.name}</strong><span className="text-sm">{states[activePerson.uf]?.name}{activePerson.city?" · "+activePerson.city:""}</span><p className="text-xs">{activePerson.region||"Região não informada"}</p></div></div>}
      <p className="text-center text-xs text-[#d8e5f4]">Os pinos indicam o estado de atuação, não o endereço pessoal do representante.</p>
    </section>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setSelected("");setSelectedId("");}} className={`rounded-lg px-4 py-2 text-sm font-bold ${!selected?"bg-[#d4af37] text-[#102a52]":"bg-slate-200"}`}>Todo o Brasil</button>{selected&&<span className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold">{states[selected]?.name}</span>}</div>
    <section className="grid gap-3 sm:grid-cols-2">
      {isLoading&&<p>Carregando representantes…</p>}
      {peopleError&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Não foi possível consultar todos os cadastros. Verifique as permissões de leitura do Supabase.</p>}
      {!isLoading&&!selectedPeople.length&&<p className="rounded-xl bg-white p-4 text-sm">Nenhum representante ativo com estado cadastrado para esta seleção.</p>}
      {selectedPeople.map(p=><article key={p.id} onClick={()=>p.uf&&selectPerson(p)} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white p-3 shadow-sm transition-all ${selectedId===p.id?"border-[#d4af37] ring-4 ring-[#d4af37]/40":"border-[#d4af37]"}`}>
        {!brokenPhotos.includes(p.id)?<img src={p.photo} alt="" onError={()=>setBrokenPhotos(v=>[...v,p.id])} className="h-16 w-16 shrink-0 rounded-full border-2 border-[#d4af37] object-cover"/>:<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200"><UserRound size={30}/></div>}
        <div className="min-w-0 flex-1"><h2 className="font-black">{p.name}</h2><p className="text-sm">{p.city? p.city+" · ":""}{p.uf||"UF não cadastrada"}</p>{p.region&&<p className="text-xs text-slate-600">{p.region}</p>}</div>
        {digits(p.phone).length>=10&&<a href={`https://wa.me/${digits(p.phone).startsWith("55")?digits(p.phone):"55"+digits(p.phone)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${p.name}`} className="rounded-full bg-[#137c45] p-3 text-white"><MessageCircle size={22}/></a>}
      </article>)}
    </section>
  </main>;
}
