import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ArrowLeft, TrendingUp, UserRound, X, UserPlus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { Link } from "@tanstack/react-router";


export const Route = createFileRoute("/_authenticated/representantes-mapa")({
  staticData: { sitemap: false },
  head: () => pageHead("/representantes-mapa", "Representantes pelo Brasil | Netinho Auto Parts", "Localize os representantes Netinho em cada estado."),
  component: RepresentativesMap,
});

type Point = [number, number];
type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Feature = { properties: { name?: string; sigla?: string; id?: string }; geometry: Geometry };
type Representative = { id: string; name: string; uf: string; city: string; region: string; phone: string; photoId: string };
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
const ufFrom = (value: string) => Object.keys(states).find(k => k === value.trim().toUpperCase() || normalize(states[k]?.name ?? "") === normalize(value)) ?? "";
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

const photoFiles: Record<string,string> = {
  abdnego:"Abdnego.webp", abdenego:"Abdnego.webp", abednego:"Abdnego.webp", domingos:"Domingos.webp", jhonatas:"Jhonatas.webp",
  justino:"José Justino.webp", livaldo:"Livaldo.webp", luciano:"Luciano.webp",
  marcello:"Marcello.webp", romullo:"Romullo.webp", romulo:"Romullo.webp",
  burgato:"José Burgato.webp", osmair:"Osmair.webp"
};
const representativePhoto = (name:string) => {
  const key=Object.keys(photoFiles).find(k=>normalize(name).includes(k));
  return key ? "/images/public/images/representantes/"+encodeURIComponent(photoFiles[key]) : null;
};
const fallbackPhoto = (name:string) => {
  const key=normalize(name);
  if(key.includes("abdnego")||key.includes("abdenego")||key.includes("abednego"))return "/images/fotos-representantes/cartao-abdnego-eugenio.webp";
  if(key.includes("osmair"))return "/images/fotos-representantes/cartao-osmair-zanetti.webp";
  return null;
};
const stateFlag = (uf:string) => `https://cdn.jsdelivr.net/gh/akagabi/bandeira-dos-estados-do-brasil@`+"master/"+uf.toLowerCase()+".svg";
const monthLabel=(date:Date)=>new Intl.DateTimeFormat("pt-BR",{month:"short",timeZone:"UTC"}).format(date).replace(".","");
const lastThreeMonths=()=>Array.from({length:3},(_,i)=>{const now=new Date();return new Date(Date.UTC(now.getFullYear(),now.getMonth()-3+i,1));});
function RepresentativesMap(){
  const [features,setFeatures]=useState<Feature[]>([]);
  const [mapError,setMapError]=useState(false);
  const [selected,setSelected]=useState("");
  const [mapExpanded,setMapExpanded]=useState(false);
  const [editingRep,setEditingRep]=useState<Representative|null>(null);
  const qc=useQueryClient();
  useEffect(()=>{
    let active=true;
    fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
      .then(r=>{if(!r.ok)throw Error("Mapa indisponível");return r.json();})
      .then((geo:{features:Feature[]})=>{if(active)setFeatures(geo.features??[]);})
      .catch(()=>{if(active)setMapError(true);});
    return()=>{active=false;};
  },[]);
  const {data:me}=useQuery(meQuery);
  const isAdmin=me?.isAdmin===true;
  const {data:people=[],isLoading,error:peopleError}=useQuery({
    queryKey:["public-representatives-map-v3"],
    staleTime:60_000,
    queryFn:async()=>{
      const {data,error}=await supabase.rpc("list_public_representatives" as never);
      if(error)throw error;
      return ((data??[]) as Array<{id:string;full_name:string;uf:string;city:string;region:string;phone:string;photo_id:string}>).map(p=>({
        id:p.id,name:p.full_name,uf:ufFrom(p.uf||""),city:p.city||"",region:p.region||"",phone:p.phone||"",photoId:p.photo_id||p.id
      })) as Representative[];
    },
  });
  const {data:adminData,isError:adminError}=useQuery({
    queryKey:["representatives-admin-3-months"],
    enabled:isAdmin,
    queryFn:async()=>{
      const months=lastThreeMonths();
      const start=months[0].toISOString();
      const end=new Date(Date.UTC(months[2].getUTCFullYear(),months[2].getUTCMonth()+1,1)).toISOString();
      const [{data:rates,error:rateError},{data:commercial,error:commercialError}]=await Promise.all([
        supabase.from("salesperson_commission_rates" as never).select("user_id,rate"),
        supabase.from("commercial_representative_commission_rates" as never).select("representative_id,rate")
      ]);
      if(rateError)throw rateError;
      if(commercialError)throw commercialError;
      const orders:Array<{seller_id:string|null;created_at:string;total:number|null;kind:string|null;status:string}>= [];
      for(let from=0;;from+=500){
        const {data,error}=await supabase.from("orders").select("seller_id,created_at,total,kind,status").gte("created_at",start).lt("created_at",end).range(from,from+499);
        if(error)throw error;
        orders.push(...(data??[]));
        if(!data||data.length<500)break;
      }
      const commissions=new Map<string,number>();
      for(const row of (rates??[]) as Array<{user_id:string;rate:number}>)commissions.set(row.user_id,Number(row.rate));
      for(const row of (commercial??[]) as Array<{representative_id:string;rate:number}>)if(!commissions.has(row.representative_id))commissions.set(row.representative_id,Number(row.rate));
      const sales=new Map<string,number[]>();
      for(const order of orders){
        if(!order.seller_id||order.kind==="orcamento"||order.status==="cancelled")continue;
        const date=new Date(order.created_at);
        const monthIndex=months.findIndex(m=>m.getUTCFullYear()===date.getUTCFullYear()&&m.getUTCMonth()===date.getUTCMonth());
        if(monthIndex<0)continue;
        const values=sales.get(order.seller_id)??[0,0,0];
        values[monthIndex]+=Number(order.total??0);
        sales.set(order.seller_id,values);
      }
      return {commissions,sales,months};
    }
  });
  const {data:editRecords}=useQuery({
    queryKey:["representatives-edit-targets"],
    enabled:isAdmin,
    queryFn:async()=>{
      const [profiles,commercial]=await Promise.all([
        supabase.from("profiles").select("id,full_name"),
        supabase.from("commercial_representatives").select("id,full_name")
      ]);
      if(profiles.error)throw profiles.error;
      if(commercial.error)throw commercial.error;
      return {profiles:profiles.data??[],commercial:commercial.data??[]};
    }
  });
  const editHash=(p:Representative)=>{
    if(editRecords?.profiles.some(x=>x.id===p.photoId||x.id===p.id))return "person:"+(editRecords.profiles.find(x=>x.id===p.photoId||x.id===p.id)?.id??p.id);
    const commercial=editRecords?.commercial.find(x=>x.id===p.id||normalize(x.full_name??"")===normalize(p.name));
    return commercial?"representative:"+commercial.id:null;
  };
  const labels=Object.entries(states).sort((a,b)=>a[1].name.localeCompare(b[1].name,"pt-BR"));
  const representativesByUf=useMemo(()=>new Map(labels.map(([uf])=>[uf,people.filter(p=>p.uf===uf).length])),[people]);
  const selectedPeople=people.filter(p=>!selected||p.uf===selected);
  const mapView=selected?stateBounds(features,selected):"0 0 620 590";
  const selectState=(uf:string)=>{setSelected(uf);setMapExpanded(false);};
  useEffect(()=>{if(!mapExpanded)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setMapExpanded(false);};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[mapExpanded]);
  return <main className="mx-auto w-full max-w-[1600px] space-y-5 px-0 pb-28 pt-0 text-[#102a52] sm:px-2">
    {!selected&&<section className="relative w-full overflow-hidden rounded-2xl bg-transparent p-0" aria-label="Mapa interativo dos estados do Brasil">
      <svg viewBox={mapView} className="mx-auto block h-[min(85dvh,1050px)] min-h-[420px] w-full max-w-none drop-shadow-[0_9px_8px_rgba(18,80,36,.16)] transition-all duration-500 sm:h-[min(90dvh,1150px)]" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Mapa do Brasil com estados selecionáveis">
        <defs>
          <linearGradient id="netinho-map-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#63d66e"/><stop offset=".45" stopColor="#229c4c"/><stop offset="1" stopColor="#08743a"/></linearGradient>
          <linearGradient id="netinho-map-selected" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe96b"/><stop offset=".5" stopColor="#f9c52c"/><stop offset="1" stopColor="#e4a919"/></linearGradient>
          <filter id="netinho-map-glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {features.filter(f=>!selected||ufFrom(f.properties.sigla||f.properties.name||"")===selected).map((f,i)=>{
          const uf=ufFrom(f.properties.sigla||f.properties.name||"");
          const active=selected===uf;
          return <path key={uf||i} d={pathOf(f.geometry)} fill={active?"url(#netinho-map-selected)":"url(#netinho-map-metal)"} stroke={active?"#063b89":"#f8d74b"} strokeWidth={active?2.4:1.3} fillRule="evenodd" className={uf?"cursor-pointer transition-all duration-300 hover:brightness-150 focus:outline-none focus:brightness-150":""} style={{filter:active?"url(#netinho-map-glow)":undefined}} role="button" tabIndex={uf?0:undefined} aria-label={`Selecionar ${states[uf]?.name||uf}`} onKeyDown={e=>{if(uf&&(e.key==="Enter"||e.key===" ")){e.preventDefault();selectState(uf);}}} onClick={()=>uf&&selectState(uf)}><title>{states[uf]?.name||f.properties.name}</title></path>;
        })}
        {labels.filter(([uf])=>!selected||selected===uf).map(([uf,st])=>{const [x,y]=project([st.lon,st.lat]);return <text key={uf} x={x} y={y} textAnchor="middle" fontSize={selected?"8":"10"} fontWeight="900" fill={selected?"#132d4d":"#ffffff"} stroke={selected?"none":"#064b93"} strokeWidth=".6" paintOrder="stroke" pointerEvents="none">{uf}</text>;})}
      </svg>
      {!features.length&&<p className="relative pb-4 text-center text-sm text-[#102a52]">{mapError?"Não foi possível carregar as divisas estaduais. Use a seleção de estados abaixo.":"Carregando mapa do Brasil…"}</p>}
      {selected&&<p className="relative pb-3 text-center text-sm font-bold text-white">{selectedPeople.length} representante(s) · {states[selected]?.name}</p>}
    </section>}
    {mapExpanded&&<button type="button" aria-label="Fechar mapa ampliado" className="fixed inset-0 z-[109] bg-[#020b1d]/85" onClick={()=>setMapExpanded(false)}/>}
    {selected&&<div className="flex items-center justify-between gap-3 rounded-xl bg-[#102a52] px-4 py-3 text-white"><div className="flex items-center gap-3"><img src={stateFlag(selected)} alt={`Bandeira de ${states[selected]?.name}`} className="h-9 w-12 rounded object-cover"/><strong>{states[selected]?.name}</strong></div><button type="button" onClick={()=>selectState("")} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold">Voltar ao Brasil</button></div>}
    <section aria-label="Seleção dos estados e Distrito Federal">
      <h2 className="mb-3 px-1 text-sm font-extrabold uppercase tracking-wider text-[#102a52]">Estados e Distrito Federal</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {labels.map(([uf,st])=><button key={uf} type="button" onClick={()=>selectState(uf===selected?"":uf)} aria-pressed={selected===uf} className={`group flex min-h-14 items-center gap-2 rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:bg-[#e4f3ff] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2677b7] ${selected===uf?"bg-[#dceeff] ring-2 ring-[#2779b7]":""}`}>
          <img src={stateFlag(uf)} alt={`Bandeira de ${st.name}`} loading="lazy" className="h-8 w-11 shrink-0 rounded object-cover shadow-sm"/>
          <span className="min-w-0 flex-1 text-xs font-bold text-[#102a52] sm:text-sm">{st.name}</span>
          {(representativesByUf.get(uf)??0)>0&&<span className="rounded-full bg-[#e0edf8] px-2 py-0.5 text-xs font-black text-[#174d7d]">{representativesByUf.get(uf)}</span>}
        </button>)}
      </div>
    </section>
    <section aria-label="Representantes cadastrados" className="space-y-3">
      {isAdmin&&<div className="flex justify-end"><Link to="/pessoas" hash="novo-representante" aria-label="Acrescentar representante" title="Acrescentar representante" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#102a52] text-white shadow-md transition hover:scale-105 hover:bg-[#21588a]"><UserPlus size={20}/></Link></div>}
      <h2 className="px-1 text-base font-black text-[#102a52]">{selected?`Representantes · ${states[selected]?.name}`:"Representantes pelo Brasil"}</h2>
      {isLoading&&<p>Carregando representantes…</p>}
      {peopleError&&<p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Não foi possível carregar os representantes cadastrados.</p>}
      {!isLoading&&!peopleError&&!selectedPeople.length&&<p className="rounded-xl bg-white p-4 text-sm">Nenhum representante cadastrado para esta seleção.</p>}
      {selectedPeople.map(p=>{
        const photo=representativePhoto(p.name);
        const phone=p.phone.replace(/[^\d+]/g,"");
        const values=adminData?.sales.get(p.photoId)??adminData?.sales.get(p.id);
        const commission=adminData?.commissions.get(p.photoId)??adminData?.commissions.get(p.id);
        const max=Math.max(1,...(values??[0,0,0]));
        return <article key={p.id} className="overflow-hidden rounded-2xl bg-white p-3 shadow-[0_5px_20px_rgba(10,36,69,.10)] sm:p-4">

          <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-5">
            <div className="min-w-0 space-y-2 text-sm sm:text-base">
              <p><strong>Representante:</strong> <span className="font-semibold">{p.name}</span></p>
              <p><strong>Telefone:</strong> {p.phone?<a className="font-semibold text-[#1267a3] underline-offset-2 hover:underline" href={`tel:${phone}`}>{p.phone}</a>:<span className="text-slate-500">Não informado</span>}</p>
              <p><strong>Estado:</strong> {states[p.uf]?.name||p.uf||"Não informado"}</p>
              <p><strong>Cidade:</strong> {p.city||"Não informada"}</p>
              {p.region&&<p className="text-xs text-slate-500"><MapPin size={13} className="mr-1 inline"/>{p.region}</p>}
            </div>
            <div className="flex flex-col items-center gap-2">
              {photo?<img src={photo} alt={`Foto de ${p.name}`} loading="lazy" className="h-24 w-24 rounded-xl bg-slate-100 object-cover object-top shadow-md sm:h-36 sm:w-36" onError={e=>{const fallback=fallbackPhoto(p.name);if(fallback&&e.currentTarget.src!==new URL(fallback,window.location.origin).href)e.currentTarget.src=fallback;else e.currentTarget.style.display="none";}}/>:<div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 sm:h-36 sm:w-36"><UserRound size={40} className="text-slate-400"/></div>}
              {isAdmin&&<button type="button" onClick={()=>setEditingRep(p)} aria-label={`Editar ficha de ${p.name}`} title={`Editar ficha de ${p.name}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f1fa] text-[#164575] shadow-sm transition hover:bg-[#cce3f5]"><Pencil size={19}/></button>}
              {isAdmin&&<div className="w-full text-center text-xs font-bold"><span className="text-green-700">Ativo</span><span className="mx-1 text-slate-300">·</span><span>{commission==null?"Comissão não cadastrada":`${commission.toLocaleString("pt-BR")}%`}</span></div>}
            </div>
          </div>
          {isAdmin&&<div className="mt-3 rounded-xl bg-[#f0f5fb] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#173c68]"><TrendingUp size={16}/> Evolução das vendas · últimos 3 meses completos</div>
            {adminError?<p className="text-xs text-amber-800">Não foi possível consultar os dados administrativos.</p>:!adminData?<p className="text-xs text-slate-500">Carregando histórico de vendas…</p>:<div className="grid grid-cols-3 gap-3">{adminData.months.map((month,i)=><div key={month.toISOString()} className="min-w-0 text-center">
              <div className="flex h-16 items-end justify-center"><div className="w-9 rounded-t-md bg-gradient-to-t from-[#164675] to-[#46a3dc] transition-all duration-500" style={{height:`${Math.max(3,((values?.[i]??0)/max)*100)}%`}}/></div>
              <p className="mt-1 text-xs font-bold uppercase">{monthLabel(month)}</p><p className="text-[11px] font-semibold">{brl(values?.[i]??0)}</p>
            </div>)}</div>}
            <p className="mt-2 text-[10px] text-slate-500">Pedidos atribuídos diretamente ao usuário, sem orçamentos ou cancelamentos. Valores não incluem vendas de outros usuários supervisionados.</p>
          </div>}
        </article>;
      })}
    </section>
    {isAdmin&&editingRep&&<RepresentativeEditDialog representative={editingRep} target={editHash(editingRep)} onClose={()=>setEditingRep(null)} onSaved={()=>{void qc.invalidateQueries({queryKey:["public-representatives-map-v3"]});void qc.invalidateQueries({queryKey:["representatives-edit-targets"]});}}/>}
  </main>;
}

function RepresentativeEditDialog({representative,target,onClose,onSaved}:{representative:Representative;target:string|null;onClose:()=>void;onSaved:()=>void}){
 const [name,setName]=useState(representative.name);
 const [phone,setPhone]=useState(representative.phone);
 const [uf,setUf]=useState(representative.uf);
 const [city,setCity]=useState(representative.city);
 const [region,setRegion]=useState(representative.region);
 const [busy,setBusy]=useState(false);
 const [rate,setRate]=useState("");
 const [active,setActive]=useState(true);
 const [email,setEmail]=useState("");
 const [cities,setCities]=useState("");
 const [initializing,setInitializing]=useState(true);
 useEffect(()=>{
  let mounted=true;
  async function load(){
   try{
    if(!target)throw Error("Cadastro não vinculado a uma ficha editável.");
    const [kind,id]=target.split(":");
    if(kind==="person"){
     const [profile,territory,commission]=await Promise.all([
      supabase.from("profiles").select("full_name,phone,email,access_active,territory_uf,territory_cities").eq("id",id).single(),
      supabase.from("person_territories" as never).select("city_base,region").eq("user_id",id).maybeSingle(),
      supabase.from("salesperson_commission_rates" as never).select("rate").eq("user_id",id).maybeSingle()
     ]);
     if(profile.error)throw profile.error;
     if(mounted){
      setName(profile.data.full_name??representative.name);setPhone(profile.data.phone??"");setEmail(profile.data.email??"");
      setActive(profile.data.access_active);setUf(profile.data.territory_uf??representative.uf);
      setCities(profile.data.territory_cities??"");
      const t=territory.data as {city_base?:string;region?:string}|null;
      setCity(t?.city_base??representative.city);setRegion(t?.region??representative.region);
      setRate(String((commission.data as {rate?:number}|null)?.rate??""));
     }
    }else{
     const [record,commission]=await Promise.all([
      supabase.from("commercial_representatives").select("*").eq("id",id).single(),
      supabase.from("commercial_representative_commission_rates" as never).select("rate").eq("representative_id",id).maybeSingle()
     ]);
     if(record.error)throw record.error;
     if(mounted){const d=record.data as Record<string,unknown>;setName(String(d.full_name??representative.name));setPhone(String(d.phone??representative.phone));setEmail(String(d.email??""));setActive(d.active!==false);setUf(String(d.uf??representative.uf));setCity(String(d.city??representative.city));setRegion(String(d.region??representative.region));setRate(String((commission.data as {rate?:number}|null)?.rate??""));}
    }
   }catch(e){if(mounted)toast.error(e instanceof Error?e.message:"Não foi possível carregar a ficha.");}
   finally{if(mounted)setInitializing(false);}
  }
  void load();return()=>{mounted=false;};
 },[target,representative]);
 async function save(){
  if(!target||!name.trim()){toast.error("Confira o cadastro e o nome.");return;}
  const rateNumber=rate.trim()===""?null:Number(rate.replace(",","."));
  if(rateNumber!==null&&(!Number.isFinite(rateNumber)||rateNumber<0.5||rateNumber>3.5)){toast.error("Comissão permitida: 0,5% a 3,5%.");return;}
  setBusy(true);
  try{
   const [kind,id]=target.split(":");
   if(kind==="person"){
    const contact=await supabase.rpc("admin_update_person_contact" as never,{p_user:id,p_name:name.trim(),p_phone:phone.trim()} as never);
    if(contact.error)throw contact.error;
    const profile=await supabase.from("profiles").select("site_role,supervisor_id").eq("id",id).single();
    if(profile.error)throw profile.error;
    const role=profile.data.site_role;
    const permissions=await supabase.rpc("admin_set_person" as never,{p_user:id,p_role:role,p_active:active,p_uf:uf,p_cities:cities,p_supervisor:profile.data.supervisor_id} as never);
    if(permissions.error)throw permissions.error;
    const territory=await supabase.from("person_territories" as never).upsert({user_id:id,city_base:city.trim(),region:region.trim()} as never,{onConflict:"user_id"});
    if(territory.error)throw territory.error;
    const commission=await supabase.rpc("admin_set_salesperson_commission" as never,{p_user:id,p_rate:rateNumber} as never);
    if(commission.error)throw commission.error;
   }else{
    const result=await supabase.from("commercial_representatives").update({full_name:name.trim(),email:email.trim(),active} as never).eq("id",id);
    if(result.error)throw result.error;
    const commission=await supabase.rpc("admin_set_commercial_representative_commission" as never,{p_representative:id,p_rate:rateNumber} as never);
    if(commission.error)throw commission.error;
   }
   toast.success("Ficha do representante atualizada.");onSaved();onClose();
  }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível salvar a ficha.");}
  finally{setBusy(false);}
 }
 return <div role="dialog" aria-modal="true" aria-label={`Editar ficha de ${representative.name}`} className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#06152e]/80 p-3">
  <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
   <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">Ficha do representante</h2><p className="text-xs text-slate-500">Edição administrativa · {representative.name}</p></div><button type="button" onClick={onClose} aria-label="Fechar ficha" className="rounded-lg bg-slate-100 p-2"><X size={22}/></button></div>
   {!target?<p className="rounded-lg bg-amber-50 p-3 text-sm">Não foi possível localizar o cadastro correspondente. Verifique o vínculo do representante no painel administrativo.</p>:initializing?<p>Carregando ficha completa…</p>:<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label className="text-sm font-bold sm:col-span-2">Representante<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
    <label className="text-sm font-bold">Telefone<input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
    <label className="text-sm font-bold">E-mail<input value={email} onChange={e=>setEmail(e.target.value)} disabled={target.startsWith("person:")} className="mt-1 w-full rounded-lg border border-slate-300 p-3 disabled:bg-slate-100"/></label>
    <label className="text-sm font-bold">Estado<select value={uf} onChange={e=>setUf(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"><option value="">Selecione</option>{Object.entries(states).map(([key,st])=><option key={key} value={key}>{st.name}</option>)}</select></label>
    <label className="text-sm font-bold">Cidade<input value={city} onChange={e=>setCity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
    <label className="text-sm font-bold sm:col-span-2">Região de atuação<input value={region} onChange={e=>setRegion(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
    {target.startsWith("person:")&&<label className="text-sm font-bold sm:col-span-2">Cidades atendidas<input value={cities} onChange={e=>setCities(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>}
    <label className="text-sm font-bold">Comissão (%)<input value={rate} onChange={e=>setRate(e.target.value)} inputMode="decimal" placeholder="0,5 a 3,5" className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
    <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Ativo</label>
    <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-3 font-bold">Cancelar</button><button type="button" disabled={busy} onClick={()=>void save()} className="rounded-lg bg-[#102a52] px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Salvando…":"Salvar alterações"}</button></div>
   </div>}
  </div>
 </div>;
}
