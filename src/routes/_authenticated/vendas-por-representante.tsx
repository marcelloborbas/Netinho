import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { TrendingUp, UsersRound, ChevronDown, UserRound, Wallet, BarChart3, Trash2, Trophy, CalendarDays } from "lucide-react";

const photoFiles:Record<string,string>={abdnego:"Abdnego.webp",abdenego:"Abdnego.webp",abednego:"Abdnego.webp",domingos:"Domingos.webp",jhonatas:"Jhonatas.webp",justino:"José Justino.webp",livaldo:"Livaldo.webp",luciano:"Luciano.webp",marcello:"Marcello.webp",romullo:"Romullo.webp",romulo:"Romullo.webp",burgato:"José Burgato.webp",osmair:"Osmair.webp"};
const normalizeName=(name:string)=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const whatsAppUrl=(phone:string|null)=>{const digits=(phone??"").replace(/\D/g,"");if(digits.length===10||digits.length===11)return `https://wa.me/55${digits}`;if(digits.startsWith("55")&&(digits.length===12||digits.length===13))return `https://wa.me/${digits}`;return null;};
const representativePhoto=(name:string)=>{const key=Object.keys(photoFiles).find(k=>normalizeName(name).includes(k));return key?"/images/public/images/representantes/"+encodeURIComponent(photoFiles[key]??""):null;};
function WhatsAppContact({phone,name}:{phone:string|null;name:string}){const url=whatsAppUrl(phone);return url?<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Conversar com ${name} pelo WhatsApp`} title={`WhatsApp de ${name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] text-white shadow-md ring-2 ring-white hover:bg-[#1da851] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#102a52]"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.5 11.5 0 0 0 2.2 17.2L.5 23.5l6.5-1.7A11.5 11.5 0 1 0 20.5 3.5ZM12 21a9.5 9.5 0 0 1-4.8-1.3l-.3-.2-3.8 1 1-3.7-.2-.4A9.5 9.5 0 1 1 12 21Zm5.2-7.1c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.4.2-.7.1a7.8 7.8 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.6l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.2 1.4 3.4a11 11 0 0 0 4.2 3.7 3.7 0 0 0 2.6.5c.8-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z"/></svg></a>:null;}
function RepresentativePortrait({name}:{name:string}){
 const [failed,setFailed]=useState(false);const src=representativePhoto(name);
 return <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#d9e7f6] to-[#b2cce7] shadow-md ring-2 ring-white sm:h-24 sm:w-24">{src&&!failed?<img src={src} alt={`Foto de ${name}`} loading="lazy" onError={()=>setFailed(true)} className="h-full w-full object-cover object-top"/>:<UserRound size={40} className="text-[#345e86]"/>}</div>;
}
export const Route=createFileRoute("/_authenticated/vendas-por-representante")({component:RepresentativeSales,staticData:{sitemap:false}});
const dueDate=(key:string)=>{const [year,month]=key.split("-").map(Number);return new Date(Date.UTC(year,month,15)).toLocaleDateString("pt-BR",{timeZone:"UTC"});};
const monthKey=(d:Date)=>{const parts=new Intl.DateTimeFormat("en-US",{year:"numeric",month:"2-digit",timeZone:"America/Sao_Paulo"}).formatToParts(d);return `${parts.find(p=>p.type==="year")?.value}-${parts.find(p=>p.type==="month")?.value}`;};
function RepresentativeSales(){
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const [expanded,setExpanded]=useState<string|null>(null);
 const {data,isLoading,isError}=useQuery({queryKey:["netinho-representative-sales"],enabled:me?.isAdmin===true,queryFn:async()=>{
  const [profiles,commercial,rates,commercialRates,directory]=await Promise.all([
   supabase.from("profiles").select("id,full_name,site_role,phone"),
   supabase.from("commercial_representatives").select("id,user_id,full_name,active,phone"),
   supabase.from("salesperson_commission_rates" as never).select("user_id,rate"),
   supabase.from("commercial_representative_commission_rates" as never).select("representative_id,rate"),
   supabase.rpc("list_public_representatives" as never)
  ]);
  for(const result of [profiles,commercial,rates,commercialRates,directory])if(result.error)throw result.error;
  type Rep={id:string;name:string;rate:number;userId:string|null;phone:string|null};
  const people=new Map<string,Rep>();
  const userRates=new Map(((rates.data??[]) as Array<{user_id:string;rate:number}>).map(x=>[x.user_id,Number(x.rate)]));
  const repRates=new Map(((commercialRates.data??[]) as Array<{representative_id:string;rate:number}>).map(x=>[x.representative_id,Number(x.rate)]));
  const profileById=new Map((profiles.data??[]).map(p=>[p.id,p]));
  const commercialById=new Map((commercial.data??[]).map(p=>[p.id,p]));
  const directoryRows=(directory.data??[]) as Array<{id:string;full_name:string;photo_id?:string;phone?:string|null}>;
  const add=(id:string,name:string,userId:string|null,rate:number,phone:string|null)=>{
   const normalized=normalizeName(name);
   // Nomes com sobrenome adicional podem vir de duas fontes do mesmo representante.
   // Só agrupar por nome quando pelo menos dois termos completos coincidirem;
   // identificadores de usuário vinculados continuam sendo a prioridade.
   const samePerson=(other:Rep)=>{
    if(userId&&other.userId&&userId===other.userId)return true;
    const otherName=normalizeName(other.name);
    if(otherName===normalized)return true;
    const shorter=otherName.length<normalized.length?otherName:normalized;
    const longer=otherName.length<normalized.length?normalized:otherName;
    return shorter.split(/\s+/).length>=2&&longer.startsWith(shorter+" ");
   };
   const existing=[...people.values()].find(samePerson);
   if(existing){
    if(!existing.userId&&userId)existing.userId=userId;
    if(rate>existing.rate)existing.rate=rate;
    if(!existing.phone&&phone)existing.phone=phone;
    if(normalized.length>normalizeName(existing.name).length)existing.name=name;
    return;
   }
   people.set(id,{id,name,userId,rate,phone});
  };
  for(const p of directoryRows){
   const commercialRep=commercialById.get(p.id);
   const userId=commercialRep?.user_id||((p.photo_id&&profileById.has(p.photo_id))?p.photo_id:profileById.has(p.id)?p.id:null);
   const profile=userId?profileById.get(userId):null;
   add(p.id,p.full_name||profile?.full_name||"Representante",userId,userId?userRates.get(userId)??repRates.get(p.id)??0:repRates.get(p.id)??0,p.phone??commercialRep?.phone??profile?.phone??null);
  }
  for(const p of profiles.data??[])if(p.site_role==="Representante")add(p.id,p.full_name||"Representante",p.id,userRates.get(p.id)??0,p.phone);
  for(const p of commercial.data??[])if(p.active)add(p.id,p.full_name||"Representante",p.user_id??null,p.user_id?userRates.get(p.user_id)??repRates.get(p.id)??0:repRates.get(p.id)??0,p.phone);
  const repByUser=new Map([...people.values()].filter(p=>p.userId).map(p=>[p.userId!,p.id]));
  const now=new Date();const periods=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return {key:monthKey(d),label:d.toLocaleDateString("pt-BR",{month:"short",year:"numeric"})};});
  const start=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString();
  const results=new Map<string,{total:number;commission:number;months:Record<string,{gross:number;commission:number}>}>();
  for(const p of people.values())results.set(p.id,{total:0,commission:0,months:{}});
  for(let from=0;;from+=500){
   const {data:orders,error}=await supabase.from("orders").select("seller_id,created_at,total,kind,status").gte("created_at",start).order("created_at").range(from,from+499);
   if(error)throw error;
   for(const o of orders??[]){
    if(!o.seller_id||!repByUser.has(o.seller_id)||o.kind==="orcamento"||o.status==="cancelled")continue;
    const period=monthKey(new Date(o.created_at));if(!periods.some(x=>x.key===period))continue;
    const repId=repByUser.get(o.seller_id)!;const item=results.get(repId)!;const value=Number(o.total??0);
    item.total+=value;item.commission+=value*people.get(repId)!.rate/100;const monthly=item.months[period]??{gross:0,commission:0};monthly.gross+=value;monthly.commission+=value*people.get(repId)!.rate/100;item.months[period]=monthly;
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
 const latestMonth=data?.periods.at(-1);
 const leader=latestMonth?[...people].sort((a,b)=>(data?.results.get(b.id)?.months[latestMonth.key]?.gross??0)-(data?.results.get(a.id)?.months[latestMonth.key]?.gross??0))[0]:undefined;
 const leaderSales=leader&&latestMonth?(data?.results.get(leader.id)?.months[latestMonth.key]?.gross??0):0;
 const monthlyTotals=(data?.periods??[]).map(m=>({key:m.key,label:m.label,total:people.reduce((sum,p)=>sum+(data?.results.get(p.id)?.months[m.key]?.gross??0),0),commission:people.reduce((sum,p)=>sum+(data?.results.get(p.id)?.months[m.key]?.commission??0),0)}));
 const previousMonth=monthlyTotals.at(-2)?.total??0;
 const currentMonth=monthlyTotals.at(-1)?.total??0;
 const change=previousMonth>0?(currentMonth-previousMonth)/previousMonth*100:null;
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
   <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]" aria-label="Destaque e composição mensal">
    <div className="rounded-2xl border-2 border-[#d4af37] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#986b10]"><Trophy size={23}/><h2 className="text-sm font-black uppercase">Destaque do mês</h2></div>
      {leader&&leaderSales>0?<div className="mt-3 flex items-center gap-3"><div className="flex shrink-0 flex-col items-center gap-2"><RepresentativePortrait name={leader.name}/><WhatsAppContact phone={leader.phone} name={leader.name}/></div><div className="min-w-0"><p className="text-xs font-semibold text-[#52627a]">{latestMonth?.label}</p><strong className="block text-base font-black">{leader.name}</strong><strong className="block text-lg font-black text-[#168544]">{brl(leaderSales)}</strong><span className="text-xs">Maior volume de vendas no mês</span></div></div>:<p className="mt-3 text-sm text-[#52627a]">Nenhuma venda registrada para representantes no mês atual.</p>}
    </div>
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><CalendarDays size={21} className="text-[#ae801c]"/><h2 className="text-sm font-black uppercase">Composição mensal</h2></div>
      <div className="mt-3 space-y-2">{monthlyTotals.map(m=><div key={m.key} className="flex items-center justify-between gap-3 border-b border-[#e4e9f0] pb-1.5 text-sm"><span className="font-semibold capitalize">{m.label}</span><span className="text-right tabular-nums"><strong className="block">{brl(m.total)} <span className="text-[10px] font-medium">bruto</span></strong><strong className="block text-[#a06f16]">{brl(m.commission)} <span className="text-[10px] font-medium">comissão</span></strong><small className="block text-[10px] text-[#52627a]">Até {dueDate(m.key)}</small></span></div>)}</div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#edf3f9] p-2 text-xs"><span className="font-bold">Variação do último mês</span><strong className="text-sm" style={{color:change==null?"#52627a":change>=0?"#168544":"#c62c35"}}>{change==null?"Sem base de comparação":`${change>0?"+":""}${change.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</strong></div>
    </div>
   </section>
   <div className="flex items-center justify-between gap-2 px-1"><h2 className="text-base font-black sm:text-lg">Desempenho da equipe</h2><span className="text-xs text-slate-500">Toque no cartão para ver os meses</span></div>
   <div className="grid gap-3 lg:grid-cols-2">
    {ranked.map((p,index)=>{const result=data!.results.get(p.id)!;const max=Math.max(1,...data!.periods.map(m=>result.months[m.key]??0));const isOpen=expanded===p.id;return <article key={p.id} className="relative overflow-hidden rounded-[22px] bg-white shadow-[0_6px_22px_rgba(13,45,79,.09)] transition-shadow hover:shadow-[0_9px_28px_rgba(13,45,79,.16)]">
     <button type="button" aria-expanded={isOpen} onClick={()=>setExpanded(isOpen?null:p.id)} className="w-full p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1c75b3] sm:p-5">
      <div className="flex items-center gap-3">
       <div className="shrink-0 self-start pb-10"><RepresentativePortrait name={p.name}/></div>
       <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-base font-black sm:text-lg">{p.name}</h3>{leader?.id===p.id&&leaderSales>0&&<span aria-label="Destaque do mês" title="Destaque do mês" className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#fff2cf] p-1.5 text-[#9a6609]"><Trophy size={16}/></span>}</div><p className="mt-1 text-xs font-semibold text-slate-500">Comissão {p.rate.toLocaleString("pt-BR")}%</p><div className="mt-2 grid grid-cols-2 gap-2"><div><span className="block text-[10px] font-bold text-[#52627a]">Venda bruta</span><strong className="block text-sm font-black tabular-nums text-[#164c7b] sm:text-lg">{brl(result.total)}</strong></div><div><span className="block text-[10px] font-bold text-[#52627a]">Comissão estimada</span><strong className="block text-sm font-black tabular-nums text-[#94701f] sm:text-lg">{brl(result.commission)}</strong></div></div></div>
       <ChevronDown size={19} className={`shrink-0 text-[#4b789f] transition-transform duration-300 ${isOpen?"rotate-180":""}`}/>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e6edf5]"><div className="h-full rounded-full bg-gradient-to-r from-[#247ab7] to-[#5cc5ef] transition-all duration-500" style={{width:`${result.total/highest*100}%`}}/></div>
      <p className="mt-1 text-right text-[10px] font-medium text-slate-500">Participação relativa ao maior volume</p>
     </button>
     <div className="absolute left-[39px] top-[112px] z-10 sm:left-[47px] sm:top-[124px]"><WhatsAppContact phone={p.phone} name={p.name}/></div>
     <div className="flex justify-end px-4 pb-3 sm:px-5"><Link to="/pessoas" hash={`#${p.userId?"person":"representative"}:${p.userId||p.id}`} onClick={event=>event.stopPropagation()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100" aria-label={`Abrir ficha para excluir ${p.name}`} title="Abrir ficha administrativa para confirmar exclusão"><Trash2 size={16}/> Apagar</Link></div>
     {isOpen&&<div className="border-t border-[#e7eef5] bg-[#f7faff] px-4 pb-4 pt-3 sm:px-5">
      <div className="mb-3 flex items-center justify-between"><strong className="text-xs uppercase tracking-wide text-[#315f86]">Evolução mensal</strong><span className="text-[11px] text-slate-500">6 meses</span></div>
      <div className="overflow-x-auto rounded-xl border border-[#d6e3ef] bg-white">
       <table className="w-full min-w-[350px] text-left text-xs sm:text-sm">
        <thead className="bg-[#102a52] text-white"><tr><th className="px-2 py-2">Mês</th><th className="px-2 py-2 text-right">Venda bruta</th><th className="px-2 py-2 text-right">Comissão</th><th className="px-2 py-2 text-right">Pagar até</th></tr></thead>
        <tbody>{data!.periods.map(m=>{const values=result.months[m.key]??{gross:0,commission:0};return <tr key={m.key} className="border-b border-[#e3eaf2]"><td className="px-2 py-2 font-bold capitalize">{m.label}</td><td className="px-2 py-2 text-right tabular-nums">{brl(values.gross)}</td><td className="px-2 py-2 text-right font-bold tabular-nums text-[#9b6b14]">{brl(values.commission)}</td><td className="px-2 py-2 text-right tabular-nums">{dueDate(m.key)}</td></tr>;})}</tbody>
        <tfoot className="bg-[#edf3f9] font-black"><tr><td className="px-2 py-2">Total</td><td className="px-2 py-2 text-right">{brl(result.total)}</td><td className="px-2 py-2 text-right">{brl(result.commission)}</td><td className="px-2 py-2 text-right">—</td></tr></tfoot>
       </table>
      </div>
      <p className="mt-2 text-[11px] text-[#52627a]">Comissão prevista para pagamento até o dia 15 do mês seguinte ao da venda. Valores estimados pelas taxas atuais; confirmar o fechamento antes de pagar.</p>
     </div>}
    </article>;})}
   </div>
   {!people.length&&<p className="rounded-xl bg-white p-4">Nenhum representante cadastrado.</p>}
   <p className="px-1 text-xs leading-relaxed text-slate-500">Pedidos atribuídos diretamente aos representantes, sem orçamentos ou cancelamentos. Comissões estimadas pelas taxas atuais, com previsão de pagamento até o dia 15 do mês seguinte à venda. O relatório não registra quitação e não substitui a conferência financeira; representantes sem vínculo de usuário podem não apresentar vendas.</p>
  </>}
 </main>;
}
