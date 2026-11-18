import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { ChartNoAxesColumnIncreasing, Coins, TrendingUp } from "lucide-react";

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
  let query=supabase.from("orders").select("seller_id,created_at,total,kind,status").gte("created_at",start).lt("created_at",end).order("created_at").range(offset,offset+499);
  if(!isAdmin)query=query.eq("seller_id",auth.user.id);
  const {data,error}=await query;
  if(error)throw error;
  allOrders.push(...(data??[]));
  if((data??[]).length<500)break;
 }
 for(const order of allOrders){if(order.kind==="orcamento"||order.status==="cancelled")continue;const p=periods.find(x=>x.key===periodKey(new Date(order.created_at)));if(p)p.total+=Number(order.total??0);}
 const currentTotal=periods[2]?.total??0;
 return {periods,currentTotal,commission:rate==null?null:currentTotal*rate/100,rate};
}
export function HomeCommercialDashboard(){
 const {data:me}=useQuery(meQuery);
 const isAdmin=me?.isAdmin===true;
 const {data,isLoading,isError}=useQuery({queryKey:["netinho-home-commercial-dashboard",isAdmin],queryFn:()=>loadDashboard(isAdmin),enabled:!!me,staleTime:120000,retry:false});
 const max=Math.max(1,...(data?.periods??[]).map(x=>x.total));
 return <section className="home-sales-panel mx-3 space-y-2 bg-transparent sm:mx-6" aria-label="Painel comercial">
  <div className="grid grid-cols-2 gap-2 sm:gap-4">
   <Link to="/vendas" search={{modo:"venda",q:"",promo:""}} className="home-sales-card flex min-h-[92px] items-center gap-2 rounded-[24px] border-[3px] border-[#e7bb45] bg-gradient-to-br from-[#0754b5] via-[#063879] to-[#071c49] px-2 py-2 text-white shadow-[inset_0_2px_2px_#ffffff,0_4px_0_#b78216,0_7px_14px_#12355d55] sm:gap-3 sm:p-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16" aria-hidden="true"><img src="/images/home-premium/icone-vendas.webp" alt="" className="block h-full w-full object-contain"/></span>
    <span className="min-w-0 flex-1"><span className="block text-[11px] font-black leading-tight sm:text-lg">Vendas do Mês</span><strong className="mt-1 block break-words text-[15px] font-black leading-tight sm:text-2xl">{isLoading?"…":isError?"Indisponível":brl(data?.currentTotal??0)}</strong></span>
   </Link>
   <div className="home-commission-card flex min-h-[92px] items-center gap-2 rounded-[24px] border-[3px] border-[#e7bb45] bg-gradient-to-br from-white via-[#f5f9ff] to-[#dbe7f4] px-2 py-2 text-[#102a52] shadow-[inset_0_2px_2px_#ffffff,0_4px_0_#b78216,0_7px_14px_#12355d55] sm:gap-3 sm:p-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center sm:h-16 sm:w-16" aria-hidden="true"><Coins className="h-10 w-10 text-[#d49a00] drop-shadow-sm sm:h-14 sm:w-14" strokeWidth={2.5}/></span>
    <span className="min-w-0 flex-1"><span className="block text-[11px] font-black leading-tight sm:text-lg">Comissão Estimada{data?.rate!=null?<span className="ml-1 text-[9px] font-medium opacity-70">({data.rate.toLocaleString("pt-BR")}%)</span>:null}</span><strong className="mt-1 block break-words text-[15px] font-black leading-tight sm:text-2xl">{isLoading?"…":isError?"Indisponível":data?.commission==null?"—":brl(data.commission)}</strong></span>
   </div>
  </div>
  <div className="home-evolution-card rounded-[26px] border-[2px] border-white bg-gradient-to-b from-white to-[#f0f6ff] p-3 text-[#102a52] shadow-[inset_0_2px_2px_#ffffff,0_5px_10px_#34577944] sm:p-5">
   <div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><ChartNoAxesColumnIncreasing className="h-6 w-6 text-[#d5a020]"/><h2 className="text-base font-black sm:text-xl">Evolução das Vendas</h2></div><span className="text-[10px] font-bold sm:text-sm">Últimos 3 meses</span></div>
   {isLoading?<p className="py-8 text-center text-sm">Carregando vendas…</p>:isError?<p role="alert" className="py-8 text-center text-sm">Não foi possível consultar as vendas.</p>:<div className="relative grid h-[136px] grid-cols-3 items-end gap-3 border-b border-[#9fb5cf] px-3 sm:h-[180px]">
    {(data?.periods??[]).map(p=><div key={p.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1"><span className="text-[10px] font-black sm:text-sm">{p.total>=1000?`R$ ${(p.total/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mil`:brl(p.total)}</span><div className="w-full max-w-24 rounded-t-md bg-gradient-to-t from-[#0c3c87] to-[#22b6f4] shadow-md" style={{height:`${Math.max(3,p.total/max*100)}%`}} title={brl(p.total)}/><span className="text-xs font-bold">{p.label}</span></div>)}
    <TrendingUp aria-hidden="true" className="pointer-events-none absolute bottom-7 right-0 h-10 w-20 text-[#e7aa00] opacity-80 sm:h-14 sm:w-28" strokeWidth={2.5}/>
   </div>}
   {isAdmin&&<Link to="/vendas-por-representante" className="mt-3 block text-right text-xs font-bold text-[#175d9d]">Ver por representante ›</Link>}
  </div>
 </section>;
}
