import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/brand";

const monthKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}`;
};
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

async function loadSalesEvolution(){
 const now=monthKey(new Date());
 const [year,month]=now.split("-").map(Number);
 const periods=Array.from({length:6},(_,i)=>{const d=new Date(Date.UTC(year,month-1-(5-i),15));return {key:d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0"),label:months[d.getUTCMonth()]};});
 const start=new Date(Date.UTC(year,month-6,1)-86400000).toISOString();
 const end=new Date(Date.UTC(year,month,1)+86400000).toISOString();
 const [profileResult,commercialResult,rateResult,commercialRateResult]=await Promise.all([
  supabase.from("profiles").select("id").eq("site_role","Representante"),
  supabase.from("commercial_representatives").select("id,user_id,active"),
  supabase.from("salesperson_commission_rates" as never).select("user_id,rate"),
  supabase.from("commercial_representative_commission_rates" as never).select("representative_id,rate")
 ]);
 for(const result of [profileResult,commercialResult,rateResult,commercialRateResult])if(result.error)throw result.error;
 const commercial=commercialResult.data??[];
 const ids=new Set<string>([...(profileResult.data??[]).map(x=>x.id),...commercial.filter(x=>x.active&&x.user_id).map(x=>x.user_id!)]);
 const rates=new Map(((rateResult.data??[]) as Array<{user_id:string;rate:number}>).map(x=>[x.user_id,Number(x.rate)]));
 const commercialRates=new Map(((commercialRateResult.data??[]) as Array<{representative_id:string;rate:number}>).map(x=>[x.representative_id,Number(x.rate)]));
 for(const rep of commercial)if(rep.user_id&&!rates.has(rep.user_id)&&commercialRates.has(rep.id))rates.set(rep.user_id,commercialRates.get(rep.id)!);
 const totals=new Map(periods.map(p=>[p.key,{total:0,commission:0}]));
 for(let from=0;;from+=500){
  const {data,error}=await supabase.from("orders").select("seller_id,created_at,total,kind,status").gte("created_at",start).lt("created_at",end).order("created_at").range(from,from+499);
  if(error)throw error;
  for(const order of data??[]){
   if(!order.seller_id||!ids.has(order.seller_id)||order.kind==="orcamento"||order.status==="cancelled")continue;
   const bucket=totals.get(monthKey(new Date(order.created_at)));
   if(!bucket)continue;
   const value=Number(order.total??0);
   bucket.total+=value;
   bucket.commission+=value*(rates.get(order.seller_id)??0)/100;
  }
  if(!data||data.length<500)break;
 }
 return periods.map(p=>({...p,...totals.get(p.key)!}));
}

const visitorParts = [
  { name: "Bomba de direção hidráulica", image: "/images/carrossel/carrossel-1.webp" },
  { name: "Kit de embreagem", image: "/images/carrossel/carrossel-2.webp" },
  { name: "Caixa de direção", image: "/images/carrossel/carrossel-3.webp" },
];

function VisitorPartsShowcase() {
  return <section className="mx-3 mb-3 grid grid-cols-3 gap-2 rounded-[26px] border-[3px] border-[#ffce2c] bg-gradient-to-b from-[#0a5aab] via-[#06316d] to-[#021844] p-2 shadow-[0_4px_0_#a96e00,0_5px_20px_#002a6c88] sm:mx-6 sm:gap-4 sm:p-4" aria-label="Peças automotivas em destaque">
    {visitorParts.map(part=><figure key={part.image} className="min-w-0 overflow-hidden rounded-xl bg-white p-1.5 shadow-sm sm:p-3">
      <img src={part.image} alt={part.name} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-lg object-contain"/>
      <figcaption className="mt-2 line-clamp-2 min-h-[2.5em] text-center text-[11px] font-bold leading-tight text-[#102a52] sm:text-base">{part.name}</figcaption>
    </figure>)}
  </section>;
}

export function HomeSalesEvolution() {
  const {data:me,isLoading:loadingMe}=useQuery(meQuery);
  const isAdmin=me?.isAdmin===true;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["home-sales-evolution-netinho"],
    enabled:isAdmin,
    queryFn: loadSalesEvolution,
    staleTime: 120_000,
  });
  const history = data ?? [];
  const chartMax = Math.max(1, ...history.map(item => item.total));
  const previousTotal = history.length > 1 ? history[history.length - 2]?.total ?? 0 : 0;
  const currentTotal = history[history.length - 1]?.total ?? 0;
  const growth = previousTotal > 0 ? (currentTotal - previousTotal) / previousTotal * 100 : null;
  if(!loadingMe&&!isAdmin)return <VisitorPartsShowcase />;
  const totalSales=history.reduce((sum,p)=>sum+p.total,0);
  const totalCommissions=history.reduce((sum,p)=>sum+p.commission,0);
  return <section className="mx-3 mb-3 !min-h-0 !h-auto overflow-hidden rounded-[26px] border-[3px] border-[#ffce2c] bg-gradient-to-b from-[#0a5aab] via-[#06316d] to-[#021844] p-3 text-white shadow-[0_4px_0_#a96e00,0_5px_20px_#002a6c88] sm:mx-6" aria-label="Evolução das vendas da Netinho">
    <Link to="/vendas-por-representante" className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" title="Abrir vendas por representante" aria-label="Abrir relatório de vendas por representante">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8 shrink-0 text-[#ffd42a]" aria-hidden="true"><path d="M3 3v18h18M7 16v-4M12 16V7M17 16V5"/></svg>
      <div><h2 className="text-lg font-black uppercase leading-tight">Evolução das Vendas da Netinho</h2><p className="text-xs text-[#d7e8ff]">Resultado de todos os representantes nos últimos seis meses</p></div>
      <span className="ml-auto text-xs font-bold text-[#ffdc6c]">Ver por representante ›</span>
    </Link>
    {loadingMe ? <p className="mt-4 text-sm">Verificando acesso…</p> : isError ? <p role="alert" className="mt-4 text-sm">Não foi possível consultar o histórico de vendas.</p> :
      isLoading ? <p role="status" className="mt-4 text-sm">Carregando evolução...</p> :
      <div className="mt-2 grid h-[165px] grid-cols-6 gap-1.5 border-b border-[#8bcaff] pb-1 sm:h-60 sm:gap-3" role="img" aria-label={`Vendas dos últimos seis meses: ${history.map(item => `${item.label}: ${brl(item.total)}`).join("; ")}`}>
        {history.map((item, index) => <div key={item.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
          <span className="max-w-full truncate text-[10px] font-extrabold tabular-nums sm:text-xs" title={brl(item.total)}>{item.total >= 1000 ? `R$ ${(item.total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : `R$ ${Math.round(item.total)}`}</span>
          <div className={`w-full max-w-16 rounded-t-md border border-white/40 shadow-[0_0_10px_#28baff77] ${index === history.length - 1 ? "bg-gradient-to-t from-[#d48a00] to-[#ffed25]" : index % 2 ? "bg-gradient-to-t from-[#dc7500] to-[#ffae20]" : "bg-gradient-to-t from-[#065ac0] to-[#1cc7ff]"}`} style={{ height: `${Math.max(item.total > 0 ? 7 : 2, item.total / chartMax * 100)}%` }} title={brl(item.total)} />
          <span className="text-[10px] font-bold sm:text-xs">{item.label}</span>
        </div>)}
      </div>}
    {!isLoading&&!isError&&!loadingMe&&<div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white/10 p-2"><p className="text-xs text-[#d7e8ff]">Total vendido · 6 meses</p><strong>{brl(totalSales)}</strong></div><div className="rounded-xl bg-white/10 p-2"><p className="text-xs text-[#d7e8ff]">Comissões estimadas · 6 meses</p><strong>{brl(totalCommissions)}</strong></div></div>}
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border-2 border-[#ffda34] bg-[#041a42]/70 p-2">
      <span className="text-sm font-black uppercase sm:text-lg">Desempenho</span>
      <span className={`text-xl font-black tabular-nums ${growth == null ? "text-white" : growth >= 0 ? "text-[#6eff6e]" : "text-[#ffb3b3]"}`}>{isLoading || isError || growth == null ? "—" : `${growth > 0 ? "+" : ""}${growth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</span>
      <span className="max-w-24 text-right text-[10px] leading-tight text-[#dceaff]">Em relação ao mês anterior</span>
    </div>
  </section>;
}
