import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MapPin, ArrowLeft, TrendingUp, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";


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
  abdnego:"Abdnego.webp", domingos:"Domingos.webp", jhonatas:"Jhonatas.webp",
  justino:"José Justino.webp", livaldo:"Livaldo.webp", luciano:"Luciano.webp",
  marcello:"Marcello.webp", romullo:"Romullo.webp", romulo:"Romullo.webp",
  burgato:"José Burgato.webp", osmair:"cartao-osmair-zanetti.webp"
};
const representativePhoto = (name:string) => {
  const key=Object.keys(photoFiles).find(k=>normalize(name).includes(k));
  return key ? (key==="osmair"?"/images/fotos-representantes/":"/images/public/images/representantes/")+encodeURIComponent(photoFiles[key]) : null;
};
const fallbackPhoto = (name:string) => {
  const key=normalize(name);
  if(key.includes("abdnego"))return "/images/fotos-representantes/cartao-abdnego-eugenio.webp";
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
  const labels=Object.entries(states).sort((a,b)=>a[1].name.localeCompare(b[1].name,"pt-BR"));
  const representativesByUf=useMemo(()=>new Map(labels.map(([uf])=>[uf,people.filter(p=>p.uf===uf).length])),[people]);
  const selectedPeople=people.filter(p=>!selected||p.uf===selected);
  const mapView=selected?stateBounds(features,selected):"0 0 620 590";
  const selectState=(uf:string)=>{setSelected(uf);setMapExpanded(Boolean(uf));};
  useEffect(()=>{if(!mapExpanded)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setMapExpanded(false);};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[mapExpanded]);
  return <main className="mx-auto w-full max-w-[1320px] space-y-5 px-2 pb-28 pt-3 text-[#102a52] sm:px-5">
    <section className={`${mapExpanded?"fixed inset-2 z-[110] overflow-auto sm:inset-8":"relative overflow-hidden"} rounded-[24px] bg-gradient-to-br from-[#06152d] via-[#103e6e] to-[#071a36] p-2 shadow-[0_16px_40px_rgba(5,20,46,.25)] sm:p-5`} aria-label="Mapa interativo dos estados do Brasil" role={mapExpanded?"dialog":undefined} aria-modal={mapExpanded?true:undefined}>
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage:"radial-gradient(ellipse at 50% 35%,rgba(64,160,231,.42),transparent 60%)"}}/>
      <div className="relative flex items-center justify-between gap-3 px-3 pt-2 text-white">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#b8d9f4]">Netinho Auto Parts</p><h1 className="text-xl font-black sm:text-2xl">{selected?states[selected]?.name:"Brasil · Nossa representação"}</h1><p className="text-xs text-[#c5ddf0]">Toque em um estado para ampliar e consultar seus representantes</p></div>
        {selected&&<div className="flex shrink-0 items-center gap-2"><img src={stateFlag(selected)} alt={`Bandeira de ${states[selected]?.name}`} className="h-9 w-12 rounded object-cover shadow-md sm:h-12 sm:w-16"/><button type="button" onClick={()=>{setSelected("");setMapExpanded(false);}} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"><ArrowLeft size={16}/> Brasil</button>{mapExpanded&&<button type="button" aria-label="Fechar mapa ampliado" onClick={()=>setMapExpanded(false)} className="rounded-full bg-white/20 p-2"><X size={19}/></button>}</div>}
      </div>
      <svg viewBox={mapView} className="relative mx-auto block h-[min(72dvh,800px)] min-h-[350px] w-full drop-shadow-[0_14px_12px_rgba(0,0,0,.45)] transition-all duration-700" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Mapa do Brasil com estados selecionáveis">
        <defs>
          <linearGradient id="netinho-map-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a5d4f2"/><stop offset=".45" stopColor="#3975a7"/><stop offset="1" stopColor="#17436e"/></linearGradient>
          <linearGradient id="netinho-map-selected" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff4b6"/><stop offset=".5" stopColor="#f1bd43"/><stop offset="1" stopColor="#b77c13"/></linearGradient>
          <filter id="netinho-map-glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {features.filter(f=>!selected||ufFrom(f.properties.sigla||f.properties.name||"")===selected).map((f,i)=>{
          const uf=ufFrom(f.properties.sigla||f.properties.name||"");
          const active=selected===uf;
          return <path key={uf||i} d={pathOf(f.geometry)} fill={active?"url(#netinho-map-selected)":"url(#netinho-map-metal)"} stroke={active?"#fff3ba":"#8dc9ef"} strokeWidth={active?2.4:1.3} fillRule="evenodd" className={uf?"cursor-pointer transition-all duration-300 hover:brightness-150 focus:outline-none focus:brightness-150":""} style={{filter:active?"url(#netinho-map-glow)":undefined}} role="button" tabIndex={uf?0:undefined} aria-label={`Selecionar ${states[uf]?.name||uf}`} onKeyDown={e=>{if(uf&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setSelected(uf);}}} onClick={()=>uf&&selectState(uf)}><title>{states[uf]?.name||f.properties.name}</title></path>;
        })}
        {labels.filter(([uf])=>!selected||selected===uf).map(([uf,st])=>{const [x,y]=project([st.lon,st.lat]);return <text key={uf} x={x} y={y} textAnchor="middle" fontSize={selected?"8":"10"} fontWeight="900" fill={selected?"#132d4d":"#ffffff"} stroke={selected?"none":"#0c3359"} strokeWidth=".6" paintOrder="stroke" pointerEvents="none">{uf}</text>;})}
      </svg>
      {!features.length&&<p className="relative pb-4 text-center text-sm text-white">{mapError?"Não foi possível carregar as divisas estaduais. Use a seleção de estados abaixo.":"Carregando mapa do Brasil…"}</p>}
      {selected&&<p className="relative pb-3 text-center text-sm font-bold text-white">{selectedPeople.length} representante(s) · {states[selected]?.name}</p>}
    </section>
    {mapExpanded&&<button type="button" aria-label="Fechar mapa ampliado" className="fixed inset-0 z-[109] bg-[#020b1d]/85" onClick={()=>setMapExpanded(false)}/>}
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
  </main>;
}
