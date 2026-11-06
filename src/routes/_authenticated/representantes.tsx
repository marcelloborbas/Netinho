import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { MapPinned, UsersRound, PhoneCall, MousePointer2 } from "lucide-react";
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
const photoFiles: Record<string,string> = {
 "abdnego":"cartao-abdnego-eugenio.webp",
 "domingos":"cartao-domingos-rodrigues.webp",
 "jhonatas":"cartao-jhonatas-jose.webp",
 "justino":"cartao-jose-justino.webp",
 "livaldo":"cartao-livaldo-silva.webp",
 "luciano":"cartao-luciano-da-silva.webp",
 "marcello":"cartao-marcello-borba.webp",
 "osmair":"cartao-osmair-zanetti.webp",
 "romullo":"cartao-romullo-sousa.webp",
 "romulo":"cartao-romullo-sousa.webp",
 "burgato":"jose-burgato.webp",
};
const representativePhoto = (name:string, photo?:string|null) => {
 const key=Object.keys(photoFiles).find(k=>normalize(name).includes(k));
 return key?"/images/fotos-representantes/"+photoFiles[key]:photo||null;
};
const stateFor = (text: string) => Object.keys(stateAliases).filter(uf => new RegExp("(?:^|[^a-z])"+uf+"(?:$|[^a-z])","i").test(text) || normalize(text).includes(stateAliases[uf] ?? "\u0000"));
const project = ([lon = 0, lat = 0]:number[] = []):[number,number] => [(lon+74)*9.2+18,(6-lat)*9.2+15];
function polygonPath(feature:Feature) {
  const coords = feature.geometry.coordinates as number[][][][] | number[][][];
  const polygons = feature.geometry.type === "MultiPolygon" ? coords as number[][][][] : [coords as number[][][]];
  return polygons.flatMap(poly=>poly.map(ring=>ring.map((point,i)=>{const [x,y]=project(point);return (i?"L":"M")+x.toFixed(1)+" "+y.toFixed(1);}).join(" ")+" Z")).join(" ");
}
function Page() {
 const {data:access}=useQuery(accessQuery);
 const [selected,setSelected]=useState<string|null>(null);
 const [geo,setGeo]=useState<GeoData|null>(null);
 const [mapError,setMapError]=useState(false);
 useEffect(()=>{let alive=true;fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson").then(r=>{if(!r.ok)throw new Error("Mapa indisponível");return r.json();}).then((data:GeoData)=>{if(alive)setGeo(data);}).catch(()=>{if(alive)setMapError(true);});return()=>{alive=false;};},[]);
 const {data:reps=[],isLoading,error}=useQuery({queryKey:["representative-directory"],queryFn:async()=>{const {data,error}=await supabase.from("representative_profiles").select("*").order("full_name");if(error)throw error;return (data??[]) as Representative[];}});
 const {data:areas=[]}=useQuery({queryKey:["representative-service-areas"],queryFn:async()=>{const {data,error}=await supabase.from("representative_service_areas_public" as never).select("slug,service_cities");if(error)return [] as ServiceArea[];return (data??[]) as ServiceArea[];}});
 const enriched=useMemo(()=>reps.filter(r=>!normalize(r.region??"").includes("teste")).map(rep=>{const service=areas.find(a=>a.slug===rep.slug)?.service_cities??"";const cities=service.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);const regionUfs=stateFor(rep.region??"");const ufs=Array.from(new Set([...regionUfs,...cities.flatMap(c=>stateFor(c))]));return {...rep,cities,ufs};}),[reps,areas]);
 const active=selected?enriched.find(r=>r.slug===selected):null;
 return <main className="mx-auto w-full max-w-4xl bg-[#071c38] px-2 pb-28 pt-3 text-white sm:px-5">
  <section className="relative isolate overflow-hidden rounded-[24px] border border-[#d4af37]/80 bg-gradient-to-br from-[#0b3260] via-[#071c38] to-[#041328] px-3 pb-5 pt-5 shadow-[0_15px_45px_rgba(0,0,0,.3)] sm:px-7">
   <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20" style={{backgroundImage:"radial-gradient(circle at 10% 10%,#e3b64b 0,transparent 28%),linear-gradient(130deg,transparent 40%,#1b67a4 60%,transparent 80%)"}}/>
   <header className="relative z-10 mx-auto max-w-xl text-center">
    <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#e7c36a] sm:text-xs">Netinho Auto Parts</p>
    <div className="mx-auto my-3 h-px w-4/5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"/>
    <div className="flex items-center justify-center gap-3"><UsersRound className="shrink-0 text-[#e7c36a]" size={38}/><h1 className="text-[clamp(25px,6.5vw,46px)] font-black italic leading-[1.05] tracking-tight text-white drop-shadow-lg">Encontre seu<br/>Representante</h1></div>
    <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-relaxed text-[#e7edf9] sm:text-base">Localize no mapa quem atende sua região e fale diretamente com seu representante.</p>
   </header>
   <div className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-[#d4af37]/50 bg-[#0b2447] p-1 shadow-[inset_0_0_30px_rgba(0,0,0,.3)] sm:p-3">
    {geo?<svg viewBox="0 0 480 390" className="mx-auto block w-full max-w-[720px]" aria-label="Mapa interativo do Brasil com fotos dos representantes" role="group">
     <defs><linearGradient id="netinho-state" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8fafc"/><stop offset="1" stopColor="#a9bfd4"/></linearGradient><filter id="netinho-map-shadow"><feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity=".5"/></filter></defs>
     {geo.features.map((feature,i)=>{const name=feature.properties.name??"";const uf=Object.keys(stateAliases).find(key=>normalize(name)===stateAliases[key])??feature.properties.sigla??feature.properties.abbreviation??"";return <path key={i} d={polygonPath(feature)} fill={enriched.some(r=>r.ufs.includes(uf))?"url(#netinho-state)":"#8da8c5"} stroke="#d4af37" strokeWidth={1.1} filter="url(#netinho-map-shadow)"><title>{name||uf}</title></path>;})}
     {enriched.flatMap(rep=>rep.ufs.filter(uf=>centroids[uf]).map(uf=>({rep,uf}))).map(({rep,uf},i,all)=>{const [cx,cy]=project(centroids[uf]);const order=all.slice(0,i).filter(p=>p.uf===uf).length;const x=cx+(order%3-1)*27;const y=cy+Math.floor(order/3)*28;const photo=representativePhoto(rep.full_name,rep.photo_url);return <g key={uf+"-"+rep.slug} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={`Abrir contato de ${rep.full_name} em ${uf}`} className="cursor-pointer outline-none" onClick={()=>setSelected(rep.slug)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(rep.slug);}}}><path d="M0 20 L-9 7 L9 7 Z" fill="#e7b93f" stroke="#061b38" strokeWidth="1.5"/><circle r="16" fill="#d4af37" stroke="#071c38" strokeWidth="2.5"/>{photo?<><defs><clipPath id={`rep-photo-${i}`}><circle r="13"/></clipPath></defs><image href={photo} x="-13" y="-13" width="26" height="26" preserveAspectRatio="xMidYMid slice" clipPath={`url(#rep-photo-${i})`}/></>:<text textAnchor="middle" y="4" fontSize="12" fontWeight="bold" fill="#08254b">{rep.full_name.charAt(0)}</text>}<title>{rep.full_name} · {uf}</title></g>;})}
    </svg>:<div className="flex min-h-[45vh] items-center justify-center text-center text-white">{mapError?"Não foi possível carregar o mapa. Tente novamente mais tarde.":"Carregando mapa do Brasil..."}</div>}
   </div>
   <div className="relative z-10 mx-auto mt-4 flex max-w-sm items-center justify-center gap-3 rounded-2xl border border-[#d4af37]/65 bg-[#06172f]/85 px-4 py-3 text-center"><MousePointer2 className="shrink-0 text-[#e7c36a]" size={29}/><p className="text-sm font-bold leading-snug">Toque na foto para conhecer seu representante.</p></div>
   {isLoading&&<p className="mt-3 text-center text-sm">Carregando representantes...</p>}
   {error&&<p role="alert" className="mt-3 text-center text-sm text-amber-200">Não foi possível carregar os representantes cadastrados.</p>}
   {!isLoading&&!enriched.some(rep=>rep.ufs.length>0)&&<p className="mt-3 text-center text-sm text-amber-100">Os estados de atuação precisam estar cadastrados para posicionar as fotos no mapa.</p>}
   <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 border-t border-[#d4af37]/40 pt-4 text-center text-[#e7c36a]">
    <div className="flex flex-col items-center gap-2"><UsersRound size={25}/><span className="text-[11px] font-bold leading-tight sm:text-sm">Representantes<br/>por estado</span></div>
    <div className="flex flex-col items-center gap-2"><MapPinned size={25}/><span className="text-[11px] font-bold leading-tight sm:text-sm">Áreas de<br/>atuação</span></div>
    <div className="flex flex-col items-center gap-2"><PhoneCall size={25}/><span className="text-[11px] font-bold leading-tight sm:text-sm">Contatos<br/>diretos</span></div>
   </div>
  </section>
  {active&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4" role="presentation" onClick={()=>setSelected(null)}>
   <section role="dialog" aria-modal="true" aria-label={`Contato de ${active.full_name}`} className="w-full max-w-sm rounded-2xl border-2 border-[#d4af37] bg-white p-5 shadow-2xl" onClick={e=>e.stopPropagation()}>
    <button type="button" onClick={()=>setSelected(null)} className="float-right rounded-lg bg-[#102a52] px-3 py-1 text-sm font-bold text-white" aria-label="Fechar ficha">Fechar ×</button>
    {representativePhoto(active.full_name,active.photo_url)&&<img src={representativePhoto(active.full_name,active.photo_url)!} alt={`Cartão de ${active.full_name}`} className="mt-8 w-full rounded-xl object-contain"/>}
    <h2 className="mt-3 text-xl font-black text-[#102a52]">{active.full_name}</h2>
    <p className="mt-2 text-sm text-slate-700">{active.cities.length?active.cities.join(" · "):active.region||"Região não informada"}</p>
    {active.phone&&<div className="mt-4 flex flex-wrap gap-3"><a href={`tel:${active.phone.replace(/[^\d+]/g,"")}`} className="rounded-lg border border-[#102a52] px-4 py-3 text-sm font-bold text-[#102a52]">Ligar: {active.phone}</a><a href={`https://wa.me/${active.phone.replace(/\D/g,"").replace(/^(?!55)(?=\d{10,11}$)/,"55")}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-700 px-4 py-3 text-sm font-bold text-white">WhatsApp</a></div>}
   </section>
  </div>}
  {access?.level===1&&<Link to="/pessoas" hash="representantes" className="mt-3 inline-block text-xs font-bold text-[#102a52] underline">Administrar regiões de atuação</Link>}
 </main>;
}
