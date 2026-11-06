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
 return <main className="mx-auto w-full max-w-3xl px-2 pt-2 pb-28 sm:px-4">
  <section className="relative overflow-hidden rounded-2xl border border-[#d4af37] bg-[#08254b] p-2 shadow-xl">
   <h1 className="py-2 text-center text-lg font-black tracking-wide text-[#ffe083]">ENCONTRE SEU REPRESENTANTE</h1>
   {geo?<svg viewBox="0 0 480 390" className="mx-auto block w-full" aria-label="Mapa do Brasil com representantes" role="group">
    {geo.features.map((feature,i)=>{const name=feature.properties.name??"";const uf=Object.keys(stateAliases).find(key=>normalize(name)===stateAliases[key])??feature.properties.sigla??feature.properties.abbreviation??"";return <path key={i} d={polygonPath(feature)} fill={enriched.some(r=>r.ufs.includes(uf))?"#d2e3f4":"#8ca9c9"} stroke="#08254b" strokeWidth={1.3}><title>{name||uf}</title></path>;})}
    {enriched.flatMap(rep=>rep.ufs.filter(uf=>centroids[uf]).map(uf=>({rep,uf}))).map(({rep,uf},i,all)=>{const [cx,cy]=project(centroids[uf]);const order=all.slice(0,i).filter(p=>p.uf===uf).length;const x=cx+(order%3-1)*27;const y=cy+Math.floor(order/3)*28;const photo=representativePhoto(rep.full_name,rep.photo_url);return <g key={uf+"-"+rep.slug} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={`Abrir contato de ${rep.full_name} em ${uf}`} className="cursor-pointer outline-none" onClick={()=>setSelected(rep.slug)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(rep.slug);}}}><circle r="15" fill="#d4af37" stroke="#08254b" strokeWidth="2"/>{photo?<><defs><clipPath id={`rep-photo-${i}`}><circle r="12"/></clipPath></defs><image href={photo} x="-12" y="-12" width="24" height="24" preserveAspectRatio="xMidYMid slice" clipPath={`url(#rep-photo-${i})`}/></>:<text textAnchor="middle" y="4" fontSize="12" fontWeight="bold" fill="#08254b">{rep.full_name.charAt(0)}</text>}<title>{rep.full_name} · {uf}</title></g>;})}
   </svg>:<div className="flex min-h-[50vh] items-center justify-center text-center text-white">{mapError?"Mapa indisponível no momento.":"Carregando mapa..."}</div>}
   {isLoading&&<p className="text-center text-sm text-white">Carregando representantes...</p>}
   {(error||areasError)&&<p role="alert" className="text-center text-sm text-amber-200">Não foi possível carregar todas as regiões cadastradas.</p>}
   {!isLoading&&!enriched.some(rep=>rep.ufs.length>0)&&<p className="px-3 pb-3 text-center text-sm text-white">Os estados de atuação precisam estar informados nos cadastros para posicionar as fotos.</p>}
   <p className="pb-2 text-center text-xs text-white/80">Toque na foto do representante para consultar seus dados.</p>
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
