import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { TrendingUp, UsersRound, ChevronDown, UserRound, Wallet, BarChart3 } from "lucide-react";

const photoFiles:Record<string,string>={abdnego:"Abdnego.webp",abdenego:"Abdnego.webp",abednego:"Abdnego.webp",domingos:"Domingos.webp",jhonatas:"Jhonatas.webp",justino:"José Justino.webp",livaldo:"Livaldo.webp",luciano:"Luciano.webp",marcello:"Marcello.webp",romullo:"Romullo.webp",romulo:"Romullo.webp",burgato:"José Burgato.webp",osmair:"Osmair.webp"};
const normalizeName=(name:string)=>name.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
const representativePhoto=(name:string)=>{const key=Object.keys(photoFiles).find(k=>normalizeName(name).includes(k));return key?"/images/public/images/representantes/"+encodeURIComponent(photoFiles[key]):null;};
function RepresentativePortrait({name}:{name:string}){
 const [failed,setFailed]=useState(false);const src=representativePhoto(name);
 return <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#d9e7f6] to-[#b2cce7] shadow-md ring-2 ring-white sm:h-24 sm:w-24">{src&&!failed?<img src={src} alt={`Foto de ${name}`} loading="lazy" onError={()=>setFailed(true)} className="h-full w-full object-cover object-top"/>:<UserRound size={40} className="text-[#345e86]"/>}</div>;
}
export const Route=createFileRoute("/_authenticated/vendas-por-representante")({component:RepresentativeSales,staticData:{sitemap:false}});
const monthKey=(d:Date)=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",timeZone:"America/Sao_Paulo"}).format(d).slice(0,7);
function RepresentativeSales(){
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const [expanded,setExpanded]=useState<string|null>(null);
 const {data,isLoading,isError}=useQuery({queryKey:["netinho-representative-sales"],enabled:me?.isAdmin===true,queryFn:async()=>{
  const [profiles,commercial,rates,commercialRates]=await Promise.all([
   supabase.from("profiles").select("id,full_name,site_role"),
   supabase.from("commercial_representatives").select("id,user_id,full_name,active"),
   supabase.from("salesperson_commission_rates" as never).select("user_id,rate"),
   supabase.from("commercial_representative_commission_rates" as never).select("representative_id,rate")
  ]);
  for(const result of [profiles,commercial,rates,commercialRates])if(result.error)throw result.error;
  const people=new Map<string,{id:string;name:string;rate:number}>();
  const userRates=new Map(((rates.data??[]) as Array<{user_id:string;rate:number}>).map(x=>[x.user_id,Number(x.rate)]));
  const repRates=new Map(((commercialRates.data??[]) as Array<{representative_id:string;rate:number}>).map(x=>[x.representative_id,Number(x.rate)]));
  for(const p of profiles.data??[])if(p.site_role==="Representante")people.set(p.id,{id:p.id,name:p.full_name||"Representante",rate:userRates.get(p.id)??0});
  for(const p of commercial.data??[])if(p.active&&p.user_id){
   const old=people.get(p.user_id);
   people.set(p.user_id,{id:p.user_id,name:old?.name||p.full_name||"Representante",rate:old?.rate||userRates.get(p.user_id)||repRates.get(p.id)||0});
  }
  const now=new Date();const periods=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return {key:monthKey(d),label:d.toLocaleDateString("pt-BR",{month:"short",year:"numeric"})};});
  const start=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString();
  const results=new Map<string,{total:number;commission:number;months:Record<string,number>}>();
  for(const p of people.values())results.set(p.id,{total:0,commission:0,months:{}});
  for(let from=0;;from+=500){
   const {data:orders,error}=await supabase.from("orders").select("seller_id,created_at,total,kind,status").gte("created_at",start).order("created_at").range(from,from+499);
   if(error)throw error;
   for(const o of orders??[]){
    if(!o.seller_id||!people.has(o.seller_id)||o.kind==="orcamento"||o.status==="cancelled")continue;
    const period=monthKey(new Date(o.created_at));if(!periods.some(x=>x.key===period))continue;
    const item=results.get(o.seller_id)!;const value=Number(o.total??0);
    item.total+=value;item.commission+=value*people.get(o.seller_id)!.rate/100;item.months[period]=(item.months[period]??0)+value;
   }
   if(!orders||orders.length<500)break;
  }
  return {people:[...people.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")),results,periods};
 }});
 if(loadingMe)return <main className="p-5">Verificando acesso…</main>;
 if(!me?.isAdmin)return <main className="p-5">Relatório disponível somente para o administrador.</main>;
 const people=data?.people??[];
 const sumSales=people.reduce((n,p)=>n+(data?.results.get(p.id)?.total??0),0);
 const sumCommission=people.reduce((n,p)=>n+(data?.results.get(p.id)?.commission??0),0);
 const ranked=[...people].sort((a,b)=>(data?.results.get(b.id)?.total??0)-(data?.results.get(a.id)?.total??0));
 const highest=Math.max(1,...ranked.map(p=>data?.results.get(p.id)?.total??0));
 return <main className="mx-auto max-w-6xl space-y-4 bg-gradient-to-b from-[#f0f5fb] to-[#e9eff7] px-3 py-4 pb-28 text-[#102a52] sm:px-6">
  <header className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#071a36] via-[#12477e] to-[#0b2b52] p-5 text-white shadow-xl sm:p-7">
   <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#6ab6ee]/15 blur-2xl"/>
   <div className="relative flex items-center gap-3"><span className="rounded-2xl bg-white/10 p-3 text-[#ffda79]"><TrendingUp size={27}/></span><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#bcd8f4]">Netinho Auto Parts · Gestão Comercial</p><h1 className="text-xl font-black sm:text-3xl">Vendas por Representante</h1><p className="text-xs text-[#c4d9ee] sm:text-sm">Desempenho e comissões · últimos seis meses</p></div></div>
  </header>
  {isLoading?<p className="rounded-2xl bg-white p-5">Carregando resultados dos representantes…</p>:isError?<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">Não foi possível consultar os dados. Verifique as permissões administrativas.</p>:<>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
    <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-5"><div className="flex items-center gap-2 text-[#2b6b9c]"><BarChart3 size={18}/><span className="text-xs font-bold">Vendas consolidadas</span></div><strong className="mt-2 block break-words text-lg font-black tabular-nums sm:text-2xl">{brl(sumSales)}</strong></div>
    <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-5"><div className="flex items-center gap-2 text-[#ae771a]"><Wallet size={18}/><span className="text-xs font-bold">Comissões estimadas</span></div><strong className="mt-2 block break-words text-lg font-black tabular-nums sm:text-2xl">{brl(sumCommission)}</strong></div>
    <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-[#102a52] p-3 text-white shadow-sm sm:col-span-1 sm:p-5"><UsersRound size={27} className="text-[#ffd779]"/><div><strong className="text-2xl font-black">{people.length}</strong><p className="text-xs text-[#d5e7f8]">Representantes cadastrados</p></div></div>
   </div>
   <div className="flex items-center justify-between gap-2 px-1"><h2 className="text-base font-black sm:text-lg">Desempenho da equipe</h2><span className="text-xs text-slate-500">Toque no cartão para ver os meses</span></div>
   <div className="grid gap-3 lg:grid-cols-2">
    {ranked.map((p,index)=>{const result=data!.results.get(p.id)!;const max=Math.max(1,...data!.periods.map(m=>result.months[m.key]??0));const isOpen=expanded===p.id;return <article key={p.id} className="overflow-hidden rounded-[22px] bg-white shadow-[0_6px_22px_rgba(13,45,79,.09)] transition-shadow hover:shadow-[0_9px_28px_rgba(13,45,79,.16)]">
     <button type="button" aria-expanded={isOpen} onClick={()=>setExpanded(isOpen?null:p.id)} className="w-full p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c75b3] sm:p-5">
      <div className="flex items-center gap-3">
       <RepresentativePortrait name={p.name}/>
       <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-base font-black sm:text-lg">{p.name}</h3>{index===0&&result.total>0&&<span className="rounded-full bg-[#fff2cf] px-2 py-0.5 text-[10px] font-bold text-[#9a6609]">Destaque</span>}</div><p className="mt-1 text-xs font-semibold text-slate-500">Comissão {p.rate.toLocaleString("pt-BR")}%</p><p className="mt-2 text-lg font-black text-[#164c7b] sm:text-xl">{brl(result.total)}</p><p className="text-xs font-semibold text-[#94701f]">Comissões: {brl(result.commission)}</p></div>
       <ChevronDown size={19} className={`shrink-0 text-[#4b789f] transition-transform duration-300 ${isOpen?"rotate-180":""}`}/>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e6edf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#247ab7] to-[#5cc5ef] transition-all duration-500" style={{width:`${result.total/highest*100}%`}}/></div>
      <p className="mt-1 text-right text-[10px] font-medium text-slate-500">Participação relativa ao maior volume</p>
     </button>
     {isOpen&&<div className="border-t border-[#e7eef5] bg-[#f7faff] px-4 pb-4 pt-3 sm:px-5">
      <div className="mb-3 flex items-center justify-between"><strong className="text-xs uppercase tracking-wide text-[#315f86]">Evolução mensal</strong><span className="text-[11px] text-slate-500">6 meses</span></div>
      <div className="grid h-40 grid-cols-6 gap-2 border-b border-[#d6e3ef]">{data!.periods.map(m=><div key={m.key} className="flex min-w-0 flex-col items-center justify-end gap-1"><span className="max-w-full truncate text-[10px] font-bold" title={brl(result.months[m.key]??0)}>{(result.months[m.key]??0)>=1000?`${((result.months[m.key]??0)/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})}k`:Math.round(result.months[m.key]??0)}</span><div className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-[#124578] to-[#46b1e7] transition-all duration-500" style={{height:Math.max(3,(result.months[m.key]??0)/max*100)+"%"}} title={brl(result.months[m.key]??0)}/><span className="text-[10px] font-bold uppercase">{m.label.split(" ")[0]}</span></div>)}</div>
      <p className="mt-3 text-right text-xs font-semibold text-[#24547f]">Total do período: {brl(result.total)}</p>
     </div>}
    </article>;})}
   </div>
   {!people.length&&<p className="rounded-xl bg-white p-4">Nenhum representante cadastrado.</p>}
   <p className="px-1 text-xs leading-relaxed text-slate-500">Pedidos atribuídos diretamente aos representantes, sem orçamentos ou cancelamentos. Comissões estimadas pelas taxas atuais; representantes sem vínculo de usuário podem não apresentar vendas.</p>
  </>}
 </main>;
}
