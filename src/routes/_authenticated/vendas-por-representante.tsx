import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { ArrowLeft, TrendingUp } from "lucide-react";

export const Route=createFileRoute("/_authenticated/vendas-por-representante")({component:RepresentativeSales,staticData:{sitemap:false}});
const monthKey=(d:Date)=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",timeZone:"America/Sao_Paulo"}).format(d).slice(0,7);
function RepresentativeSales(){
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const [selected,setSelected]=useState("todos");
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
 const visible=data?.people.filter(p=>selected==="todos"||selected===p.id)??[];
 const sumSales=visible.reduce((n,p)=>n+(data?.results.get(p.id)?.total??0),0);
 const sumCommission=visible.reduce((n,p)=>n+(data?.results.get(p.id)?.commission??0),0);
 return <main className="mx-auto max-w-5xl space-y-4 px-3 py-5 pb-28 text-[#102a52]">
  <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={17}/>Página inicial</Link>
  <header className="rounded-2xl bg-[#102a52] p-5 text-white"><h1 className="flex items-center gap-2 text-xl font-black"><TrendingUp/> Vendas por representante</h1><p className="mt-1 text-sm text-blue-100">Evolução das vendas e comissões estimadas · últimos seis meses</p></header>
  {isLoading?<p>Carregando relatório…</p>:isError?<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">Não foi possível consultar os dados. Verifique as permissões administrativas.</p>:<>
   <label className="block rounded-xl bg-white p-3 text-sm font-bold">Representante<select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"><option value="todos">Todos os representantes</option>{data?.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#e8f0f8] p-4"><p className="text-xs font-bold">Vendas totais</p><strong className="text-lg">{brl(sumSales)}</strong></div><div className="rounded-xl bg-[#fff4d8] p-4"><p className="text-xs font-bold">Comissões estimadas</p><strong className="text-lg">{brl(sumCommission)}</strong></div></div>
   {visible.map(p=>{const result=data!.results.get(p.id)!;const max=Math.max(1,...data!.periods.map(m=>result.months[m.key]??0));return <section key={p.id} className="rounded-2xl bg-white p-4 shadow-sm"><h2 className="font-black">{p.name}</h2><p className="mt-1 text-sm">Vendas: <strong>{brl(result.total)}</strong> · Comissão {p.rate.toLocaleString("pt-BR")}%: <strong>{brl(result.commission)}</strong></p><div className="mt-4 grid h-36 grid-cols-6 gap-2 border-b border-slate-200">{data!.periods.map(m=><div key={m.key} className="flex min-w-0 flex-col items-center justify-end gap-1"><div className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-[#123d71] to-[#49a4df]" style={{height:Math.max(2,(result.months[m.key]??0)/max*85)+"%"}} title={brl(result.months[m.key]??0)}/><span className="text-[10px] font-bold">{m.label.split(" ")[0]}</span></div>)}</div></section>;})}
   {!visible.length&&<p className="rounded-xl bg-white p-4">Nenhum representante cadastrado.</p>}
   <p className="text-xs text-slate-500">Considera pedidos atribuídos diretamente aos representantes, excluindo orçamentos e cancelamentos. As comissões são estimadas pelas taxas atuais.</p>
  </>}
 </main>;
}
