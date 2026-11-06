import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { MapPin, MessageCircle, Search, UserRound, Phone, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/representantes")({
  staticData: { sitemap: false },
  head: () => pageHead("/representantes", "Buscar representantes | Netinho Auto Parts", "Localize representantes da Netinho Auto Parts por cidade e estado e consulte suas áreas de atendimento."), component: Page });
type Representative = { slug: string; full_name: string; region: string; phone: string | null; photo_url?: string | null };
type ServiceArea = { slug: string; service_cities: string | null };
type Feature = { properties: { name?: string; sigla?: string; abbreviation?: string }; geometry: { type: string; coordinates: unknown } };
type GeoData = { features: Feature[] };
const centroids: Record<string,[number,number]> = {AC:[-70,-9],AL:[-36.6,-9.6],AP:[-51,-1.2],AM:[-64,-4],BA:[-41.7,-12.8],CE:[-39.5,-5.2],DF:[-47.9,-15.8],ES:[-40.5,-19.6],GO:[-49.4,-16],MA:[-45,-5],MT:[-56,-12.7],MS:[-54.5,-20.5],MG:[-44.7,-18.6],PA:[-52,-4],PB:[-36.8,-7.1],PR:[-51,-24.8],PE:[-37.9,-8.4],PI:[-42.8,-7.5],RJ:[-42.6,-22.2],RN:[-36.4,-5.8],RS:[-53,-30],RO:[-63,-10.8],RR:[-61,2],SC:[-50.5,-27.3],SP:[-48.5,-22.5],SE:[-37.4,-10.6],TO:[-48,-10]};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const stateAliases: Record<string,string> = {SP:"sao paulo",RJ:"rio de janeiro",MG:"minas gerais",PR:"parana",SC:"santa catarina",RS:"rio grande do sul",ES:"espirito santo",BA:"bahia",GO:"goias",DF:"distrito federal",MT:"mato grosso",MS:"mato grosso do sul",PE:"pernambuco",CE:"ceara",PA:"para",AM:"amazonas",MA:"maranhao",PB:"paraiba",RN:"rio grande do norte",AL:"alagoas",SE:"sergipe",PI:"piaui",TO:"tocantins",RO:"rondonia",AC:"acre",AP:"amapa",RR:"roraima"};
const stateFor = (text: string) => Object.keys(stateAliases).filter(uf => new RegExp("(?:^|[^a-z])"+uf+"(?:$|[^a-z])","i").test(text) || normalize(text).includes(stateAliases[uf]));
const project = ([lon,lat]:number[]):[number,number] => [(lon+74)*9.2+18,(6-lat)*9.2+15];
function polygonPath(feature:Feature) {
  const coords = feature.geometry.coordinates as number[][][][] | number[][][];
  const polygons = feature.geometry.type === "MultiPolygon" ? coords as number[][][][] : [coords as number[][][]];
  return polygons.flatMap(poly=>poly.map(ring=>ring.map((point,i)=>{const [x,y]=project(point);return (i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);}).join(" ")+" Z")).join(" ");
}
function Page() {
 const {data:access}=useQuery(accessQuery);
 const [city,setCity]=useState("");
 const [state,setState]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 const [geo,setGeo]=useState<GeoData|null>(null);
 const [mapError,setMapError]=useState(false);
 useEffect(()=>{let alive=true;fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson").then(r=>{if(!r.ok)throw new Error("Mapa indisponível");return r.json();}).then((data:GeoData)=>{if(alive)setGeo(data);}).catch(()=>{if(alive)setMapError(true);});return()=>{alive=false;};},[]);
 const {data:reps=[],isLoading,error}=useQuery({queryKey:["representative-directory"],queryFn:async()=>{const {data,error}=await supabase.from("representative_profiles").select("*").order("full_name");if(error)throw error;return (data??[]) as Representative[];}});
 const {data:areas=[],error:areasError}=useQuery({queryKey:["representative-service-areas"],queryFn:async()=>{const {data,error}=await supabase.from("representative_service_areas_public" as never).select("slug,service_cities");if(error)throw error;return (data??[]) as ServiceArea[];}});
 const enriched=useMemo(()=>reps.filter(r=>!normalize(r.region??"").includes("teste")).map(rep=>{const service=areas.find(a=>a.slug===rep.slug)?.service_cities??"";const cities=service.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);const regionUfs=stateFor(rep.region??"");const ufs=Array.from(new Set([...regionUfs,...cities.flatMap(c=>stateFor(c))]));return {...rep,cities,ufs};}),[reps,areas]);
 const matching=useMemo(()=>enriched.filter(r=>{const query=normalize(city);const uf=state.toUpperCase();if(uf&&!r.ufs.includes(uf))return false;if(!query)return true;return r.cities.some(c=>normalize(c).includes(query))||normalize(r.region??"").includes(query);}),[enriched,city,state]);
 const active=selected?enriched.find(r=>r.slug===selected):null;
 const stateCount=(uf:string)=>enriched.filter(r=>r.ufs.includes(uf)).length;
 return <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 pb-28 sm:px-6">
  <header className="rounded-[26px] border-2 border-[#d4af37] bg-gradient-to-br from-[#06172f] via-[#16477e] to-[#06172f] px-5 py-7 text-center text-white shadow-xl">
   <MapPin className="mx-auto mb-2 text-[#ffe083]" size={34}/><h1 className="text-2xl font-black tracking-wide text-[#ffe083] sm:text-3xl">ENCONTRE SEU REPRESENTANTE</h1><p className="mt-2 text-sm text-white/90">Selecione um estado no mapa ou pesquise sua cidade para descobrir quem atende sua região.</p>
  </header>
  <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
   <section className="rounded-[24px] border border-[#d4af37] bg-[#0b294e] p-3 shadow-lg">
    <h2 className="mb-2 text-center text-sm font-black uppercase tracking-wide text-[#ffe083]">Brasil · Estados e áreas de atuação</h2>
    {geo?<svg viewBox="0 0 480 390" className="mx-auto w-full max-w-[540px]" role="img" aria-label="Mapa interativo do Brasil com divisão dos estados">
      {geo.features.map((feature,i)=>{const name=feature.properties.name??"";const uf=Object.keys(stateAliases).find(key=>normalize(name)===stateAliases[key])??feature.properties.sigla??feature.properties.abbreviation??"";const count=stateCount(uf);return <path key={i} d={polygonPath(feature)} fill={state===uf?"#ffd65a":count?"#2d8ac4":"#d9e7f5"} stroke="#09264a" strokeWidth={1.15} className="cursor-pointer transition-colors hover:fill-[#ffe083]" onClick={()=>{setState(uf);setSelected(null);}}><title>{name||uf} · {count} representante(s)</title></path>;})}
      {Object.entries(centroids).filter(([uf])=>stateCount(uf)>0).map(([uf,coords])=>{const [x,y]=project(coords);return <g key={uf} onClick={()=>{setState(uf);setSelected(null);}} className="cursor-pointer"><circle cx={x} cy={y} r={7} fill="#f5b935" stroke="#102a52" strokeWidth={2}/><text x={x} y={y+2.5} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#102a52">{stateCount(uf)}</text><title>{uf}: {stateCount(uf)} representante(s)</title></g>;})}
     </svg>:<div className="flex min-h-56 items-center justify-center text-center text-sm text-white/80">{mapError?"Não foi possível carregar o desenho do mapa. Use a seleção de estados abaixo.":"Carregando mapa do Brasil..."}</div>}
    <p className="mt-2 text-center text-xs text-white/80">Pontos dourados indicam estados com representantes cadastrados. Toque no estado para filtrar.</p>
    <div className="mt-3 grid grid-cols-7 gap-1">{Object.keys(centroids).sort().map(uf=><button type="button" key={uf} onClick={()=>{setState(state===uf?"":uf);setSelected(null);}} className={`rounded-md border px-1 py-2 text-xs font-bold ${state===uf?"border-[#ffe083] bg-[#ffe083] text-[#102a52]":"border-white/20 bg-white/10 text-white"}`}>{uf}</button>)}</div>
   </section>
   <section className="space-y-4">
    <div className="rounded-[22px] border border-[#d4af37] bg-white p-4 shadow-md"><h2 className="text-lg font-black text-[#102a52]">Buscar por localidade</h2><div className="mt-3 grid grid-cols-[1fr_100px] gap-2"><label className="text-xs font-bold text-[#102a52]">Cidade<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Ex.: Taubaté" className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-[#102a52]"/></label><label className="text-xs font-bold text-[#102a52]">Estado<select value={state} onChange={e=>setState(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2 py-3 text-sm text-[#102a52]"><option value="">Todos</option>{Object.keys(centroids).sort().map(uf=><option key={uf} value={uf}>{uf}</option>)}</select></label></div><button type="button" onClick={()=>{setCity("");setState("");setSelected(null);}} className="mt-3 text-xs font-bold text-[#16528d] underline">Limpar filtros</button></div>
    {(error||areasError)&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">Não foi possível consultar todos os dados de atendimento.</p>}
    <h2 className="text-lg font-black text-[#102a52]">Representantes {isLoading?"· carregando":`· ${matching.length}`}</h2>
    <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">{matching.map(rep=><article key={rep.slug} className={`overflow-hidden rounded-[20px] border-2 bg-white shadow-md ${selected===rep.slug?"border-[#d4af37]":"border-[#dce5f0]"}`}>
      <button type="button" onClick={()=>setSelected(selected===rep.slug?null:rep.slug)} className="flex w-full items-center gap-3 p-3 text-left">
       {rep.photo_url?<img src={rep.photo_url} alt={`Foto de ${rep.full_name}`} className="h-16 w-16 shrink-0 rounded-full border-2 border-[#d4af37] object-cover" />:<span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#102a52] text-white"><UserRound size={31}/></span>}
       <span className="min-w-0 flex-1"><strong className="block text-base text-[#102a52]">{rep.full_name}</strong><span className="mt-1 block text-xs text-slate-600">{rep.region||rep.ufs.join(", ")||"Região a confirmar"}</span></span><ChevronDown className={`shrink-0 text-[#102a52] transition-transform ${selected===rep.slug?"rotate-180":""}`}/></button>
      {selected===rep.slug&&<div className="space-y-3 border-t border-slate-200 bg-[#f3f7fc] p-4"><p className="text-xs font-black uppercase text-[#8a6516]">Localidades de atuação</p><p className="text-sm font-semibold text-[#102a52]">{rep.cities.length?rep.cities.join(" · "):rep.region||"Localidades ainda não informadas"}</p>{rep.phone&&<a href={`tel:${rep.phone.replace(/[^\d+]/g,"")}`} className="flex items-center gap-2 text-sm font-bold text-[#102a52]"><Phone size={17}/>{rep.phone}</a>}{rep.phone&&<a href={`https://wa.me/${rep.phone.replace(/\D/g,"").replace(/^(?!55)(?=\d{10,11}$)/,"55")}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#166534] px-4 text-sm font-black text-white"><MessageCircle size={17}/> Falar pelo WhatsApp</a>}</div>}
     </article>)}</div>
    {!isLoading&&!matching.length&&<div className="rounded-xl border border-[#d4af37] bg-white p-5 text-sm text-[#102a52]">Nenhum representante encontrado para os filtros escolhidos. Tente outra cidade ou estado.</div>}
    {active&&<p className="text-xs text-slate-600">Representante selecionado: {active.full_name}</p>}
   </section>
  </div>
  {access?.level===1&&<Link to="/pessoas" hash="representantes" className="inline-flex rounded-xl border border-[#d4af37] bg-white px-4 py-3 text-sm font-bold text-[#102a52]">Administrar representantes e regiões</Link>}
 </main>;
}
