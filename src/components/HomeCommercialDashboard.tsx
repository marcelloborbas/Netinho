import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { ChartNoAxesColumnIncreasing, TrendingUp, ChevronRight, ClipboardList, Users } from "lucide-react";

const periodKey=(date:Date)=>{const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(date);return p.find(x=>x.type==="year")?.value+"-"+p.find(x=>x.type==="month")?.value;};
const names=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
async function loadDashboard(isAdmin:boolean){
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError)throw authError;
 if(!auth.user)return null;
 const now=new Date();const current=periodKey(now);const [year=now.getFullYear(),month=now.getMonth()+1]=current.split("-").map(Number);
 const periods=Array.from({length:3},(_,i)=>{const d=new Date(Date.UTC(year,month-3+i,15));return {key:d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0"),label:names[d.getUTCMonth()],total:0};});
 const start=new Date(Date.UTC(year,month-3,1)-86400000).toISOString();
 const end=new Date(Date.UTC(year,month,1)+86400000).toISOString();
 // A comissão deve ser consultada também para o administrador.
 // A ausência de registro não equivale a comissão zero.
 const {data:rateRow,error:rateError}=await supabase.from("salesperson_commission_rates" as never).select("rate").eq("user_id",auth.user.id).maybeSingle();
 if(rateError)throw rateError;
 const registeredRate=(rateRow as {rate?:number}|null)?.rate;
 const rate=registeredRate==null?(isAdmin?3.5:null):Number(registeredRate);
 const allOrders=[] as Array<{seller_id:string|null;created_at:string;total:number|null;kind:string|null;status:string|null}>;
 for(let offset=0;;offset+=500){
  let query=supabase.from("orders").select("id,number,seller_id,customer_id,customer_snapshot,created_at,total,kind,status").gte("created_at",start).lt("created_at",end).order("created_at").range(offset,offset+499);
  if(!isAdmin)query=query.eq("seller_id",auth.user.id);
  const {data,error}=await query;
  if(error)throw error;
  allOrders.push(...((data??[]) as unknown as typeof allOrders));
  if((data??[]).length<500)break;
 }
 for(const order of allOrders){if(order.kind==="orcamento"||order.status==="cancelled")continue;const p=periods.find(x=>x.key===periodKey(new Date(order.created_at)));if(p)p.total+=Number(order.total??0);}
 const currentTotal=periods[2]?.total??0;
 const validOrders=allOrders.filter(order=>order.kind!=="orcamento"&&order.status!=="cancelled");
 const currentOrders=validOrders.filter(order=>periodKey(new Date(order.created_at))===periods[2]?.key);
 const orderCount=currentOrders.length;
 const clientCount=new Set(currentOrders.map(order=>order.customer_id).filter((id):id is string=>!!id)).size;
 const previousTotal=periods[1]?.total??0;
 const growth=previousTotal>0?(currentTotal-previousTotal)/previousTotal*100:null;
 const recentOrders=[...validOrders].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,3);
 return {periods,currentTotal,commission:rate==null?null:currentTotal*rate/100,rate,orderCount,clientCount,growth,recentOrders};
}
export function HomeCommercialDashboard({mode="all"}:{mode?:"all"|"carousel"|"evolution"}){
 const {data:me}=useQuery(meQuery);
 const isAdmin=me?.isAdmin===true;
 const {data,isLoading,isError}=useQuery({queryKey:["netinho-home-commercial-dashboard",isAdmin],queryFn:()=>loadDashboard(isAdmin),enabled:!!me,staleTime:120000,retry:false});
 const max=Math.max(1,...(data?.periods??[]).map(x=>x.total));
 const statusLabels:Record<string,string>={sent:"Enviado",received:"Recebido",processing:"Em separação",invoiced:"Faturado",cancelled:"Cancelado"};
 const metricValue=(value:number|undefined)=>isLoading?"…":isError?"—":(value??0).toLocaleString("pt-BR");
 return <section className={`home-sales-panel home-sales-${mode} mx-3 space-y-3 bg-transparent sm:mx-6`} aria-label={mode==="carousel"?"Carrossel de vendas e comissão":"Painel comercial"}>
  {mode==="evolution"&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
   <div className="flex min-h-[88px] items-center gap-2 rounded-2xl border border-[#64b5f6] bg-gradient-to-br from-[#159fe8] to-[#07519d] p-3 text-white shadow-md"><ChartNoAxesColumnIncreasing className="h-7 w-7 shrink-0"/><span className="min-w-0"><small className="block text-[11px] font-semibold text-white/85">Vendas no mês</small><strong className="block truncate text-lg font-black">{isLoading?"…":isError?"—":brl(data?.currentTotal??0)}</strong></span></div>
   <div className="flex min-h-[88px] items-center gap-2 rounded-2xl border border-[#7de0ad] bg-gradient-to-br from-[#20bd73] to-[#087548] p-3 text-white shadow-md"><ClipboardList className="h-7 w-7 shrink-0"/><span className="min-w-0"><small className="block text-[11px] font-semibold text-white/85">Pedidos no mês</small><strong className="block truncate text-xl font-black">{metricValue(data?.orderCount)}</strong></span></div>
   <div className="flex min-h-[88px] items-center gap-2 rounded-2xl border border-[#ffd17a] bg-gradient-to-br from-[#ffad36] to-[#d96b11] p-3 text-white shadow-md"><Users className="h-7 w-7 shrink-0"/><span className="min-w-0"><small className="block text-[11px] font-semibold text-white/85">Clientes atendidos</small><strong className="block truncate text-xl font-black">{metricValue(data?.clientCount)}</strong></span></div>
   <div className="flex min-h-[88px] items-center gap-2 rounded-2xl border border-[#c9a8ff] bg-gradient-to-br from-[#9661dc] to-[#5833a7] p-3 text-white shadow-md"><TrendingUp className="h-7 w-7 shrink-0"/><span className="min-w-0"><small className="block text-[11px] font-semibold text-white/85">Crescimento</small><strong className="block truncate text-xl font-black">{isLoading||isError||data?.growth==null?"—":`${data.growth>0?"+":""}${data.growth.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</strong></span></div>
  </div>}
  {mode!=="carousel"&&<div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
   <div className="home-evolution-card rounded-[26px] border-[2px] border-white bg-gradient-to-b from-white to-[#f0f6ff] p-3 text-[#102a52] shadow-[inset_0_2px_2px_#ffffff,0_5px_10px_#34577944] sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><ChartNoAxesColumnIncreasing className="h-6 w-6 text-[#d5a020]"/><h2 className="text-base font-black sm:text-xl">Evolução das Vendas</h2></div><span className="text-[10px] font-bold sm:text-sm">Últimos 3 meses</span></div>
    {isLoading?<p className="py-8 text-center text-sm">Carregando vendas…</p>:isError?<p role="alert" className="py-8 text-center text-sm">Não foi possível consultar as vendas.</p>:<div className="home-chart-bars relative grid h-[136px] grid-cols-3 items-end gap-3 border-b border-[#9fb5cf] px-3 sm:h-[180px]">
     {(data?.periods??[]).map(p=><div key={p.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1"><span className="text-[10px] font-black sm:text-sm">{p.total>=1000?`R$ ${(p.total/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mil`:brl(p.total)}</span><div className="w-full max-w-24 rounded-t-md bg-gradient-to-t from-[#0c3c87] to-[#22b6f4] shadow-md" style={{height:`${Math.max(3,p.total/max*100)}%`}} title={brl(p.total)}/><span className="text-xs font-bold">{p.label}</span></div>)}
     <TrendingUp aria-hidden="true" className="pointer-events-none absolute bottom-7 right-0 h-10 w-20 text-[#e7aa00] opacity-80 sm:h-14 sm:w-28" strokeWidth={2.5}/>
    </div>}
    {isAdmin&&<Link to="/vendas-por-representante" className="home-chart-link mt-3 block text-right text-xs font-bold text-[#175d9d]">Ver por representante ›</Link>}
   </div>
   {mode==="evolution"&&<div className="home-evolution-card rounded-[26px] border-[2px] border-white bg-gradient-to-b from-white to-[#f0f6ff] p-3 text-[#102a52] shadow-[inset_0_2px_2px_#ffffff,0_5px_10px_#34577944] sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-black sm:text-xl">Últimos pedidos</h2><ClipboardList className="h-6 w-6 text-[#d5a020]"/></div>
    {isLoading?<p className="py-6 text-center text-sm">Carregando pedidos…</p>:isError?<p className="py-6 text-center text-sm">Não foi possível carregar os pedidos.</p>:data?.recentOrders.length?<div className="divide-y divide-[#c7d6e9]">{data.recentOrders.map(order=>{const snapshot=order.customer_snapshot??{};const customerName=String(snapshot["trade_name"]??snapshot["company_name"]??snapshot["name"]??"Cliente");return <div key={order.id} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><strong className="block text-sm">Pedido #{order.number}</strong><span className="block truncate text-xs text-[#526781]">{customerName}</span><span className="text-[11px] text-[#526781]">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span></div><span className="shrink-0 rounded-full bg-[#e7f2ff] px-2 py-1 text-[10px] font-bold text-[#174e9b]">{statusLabels[order.status??""]??"Registrado"}</span></div>})}</div>:<p className="py-6 text-center text-sm text-[#526781]">Ainda não há pedidos registrados neste período.</p>}
    <Link to="/pedidos" className="mt-2 block text-right text-xs font-bold text-[#175d9d]">Ver todos os pedidos ›</Link>
   </div>}
  </div>}
 </section>;
}
