import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { ChartNoAxesColumnIncreasing, ChevronRight, ClipboardList, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { HOME_ICON_SIZE, HOME_ICON_STROKE, HomeIconTile } from "@/components/HomeIconTile";

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
 const allOrders=[] as Array<{id:string;number:number;seller_id:string|null;customer_id:string|null;customer_snapshot:Record<string, unknown>|null;created_at:string;total:number|null;kind:string|null;status:string|null}>;
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
type DashboardData = NonNullable<Awaited<ReturnType<typeof loadDashboard>>>;

/** Consulta única compartilhada pelo painel de vendas e pela lista de pedidos (mesma chave de cache). */
function useHomeDashboard() {
 const { data: me } = useQuery(meQuery);
 const isAdmin = me?.isAdmin === true;
 const query = useQuery({ queryKey: ["netinho-home-commercial-dashboard", isAdmin], queryFn: () => loadDashboard(isAdmin), enabled: !!me, staleTime: 120000, retry: false });
 return { ...query, isAdmin };
}

const cardShell = "rounded-2xl border border-border bg-card p-4 text-navy shadow-home-card sm:p-5";

interface KpiProps { icon: LucideIcon; label: string; value: string }

function Kpi({ icon, label, value }: KpiProps) {
 return (
  <li className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gold/50 bg-card p-3 shadow-home-card sm:flex-row sm:items-center sm:gap-3">
   <HomeIconTile icon={icon} />
   <span className="min-w-0">
    <small className="block text-xs font-semibold text-muted-foreground">{label}</small>
    <strong className="block break-words text-base font-black tabular-nums leading-tight sm:text-lg">{value}</strong>
   </span>
  </li>
 );
}

const shortMoney = (total: number) => total >= 1000 ? `R$ ${(total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl(total);

function SalesChart({ periods }: { periods: DashboardData["periods"] }) {
 const max = Math.max(1, ...periods.map(p => p.total));
 return (
  <ol className="grid h-44 grid-cols-3 items-end gap-3 border-b border-border px-1 sm:h-52 sm:gap-6" aria-label={`Vendas dos últimos 3 meses: ${periods.map(p => `${p.label}: ${brl(p.total)}`).join("; ")}`}>
   {periods.map((p, index) => (
    <li key={p.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
     <span className="max-w-full truncate text-xs font-black tabular-nums" title={brl(p.total)}>{shortMoney(p.total)}</span>
     <span aria-hidden="true" className={`block w-full max-w-20 rounded-t-md ${index === periods.length - 1 ? "bg-gold" : "bg-navy-soft"}`} style={{ height: `${Math.max(3, p.total / max * 78)}%` }} />
    </li>
   ))}
  </ol>
 );
}

/** Painel de vendas em três blocos separados: título/período, indicadores e gráfico. */
export function HomeSalesPanel() {
 const { data, isLoading, isError, isAdmin } = useHomeDashboard();
 const placeholder = isLoading ? "…" : "—";
 const ready = !isLoading && !isError;
 const count = (value: number | undefined) => ready ? (value ?? 0).toLocaleString("pt-BR") : placeholder;
 const growth = ready && data?.growth != null ? `${data.growth > 0 ? "+" : ""}${data.growth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : placeholder;
 return (
  <section className="space-y-3" aria-labelledby="home-sales-title">
   <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
    <div className="flex min-w-0 items-center gap-2">
     <ChartNoAxesColumnIncreasing size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} className="shrink-0 text-gold-deep" aria-hidden="true" />
     <h2 id="home-sales-title" className="truncate text-lg font-black text-navy sm:text-xl">Evolução das vendas</h2>
    </div>
    <span className="shrink-0 rounded-full bg-navy px-3 py-1 text-xs font-bold text-gold">Últimos 3 meses</span>
   </div>
   <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores do mês">
    <Kpi icon={ChartNoAxesColumnIncreasing} label="Vendas no mês" value={ready ? brl(data?.currentTotal ?? 0) : placeholder} />
    <Kpi icon={ClipboardList} label="Pedidos no mês" value={count(data?.orderCount)} />
    <Kpi icon={Users} label="Clientes atendidos" value={count(data?.clientCount)} />
    <Kpi icon={TrendingUp} label="Crescimento" value={growth} />
   </ul>
   <div className={cardShell}>
    {isLoading ? <p role="status" className="py-12 text-center text-sm">Carregando vendas…</p>
     : isError ? <p role="alert" className="py-12 text-center text-sm">Não foi possível consultar as vendas.</p>
     : <>
       <SalesChart periods={data?.periods ?? []} />
       <ol className="mt-2 grid grid-cols-3 gap-3 px-1 text-center text-xs font-bold sm:gap-6" aria-hidden="true">
        {(data?.periods ?? []).map(p => <li key={p.key}>{p.label}</li>)}
       </ol>
      </>}
    {isAdmin && <Link to="/vendas-por-representante" className="mt-4 flex items-center justify-end gap-1 text-sm font-bold text-navy-soft hover:underline">Ver por representante <ChevronRight size={16} strokeWidth={HOME_ICON_STROKE} aria-hidden="true" /></Link>}
   </div>
  </section>
 );
}

const statusLabels: Record<string, string> = { sent: "Enviado", received: "Recebido", processing: "Em separação", invoiced: "Faturado", cancelled: "Cancelado" };

/** Últimos pedidos do período, exibidos depois das montadoras. */
export function HomeRecentOrders() {
 const { data, isLoading, isError } = useHomeDashboard();
 return (
  <section className={cardShell} aria-labelledby="home-orders-title">
   <div className="mb-2 flex items-center justify-between gap-3">
    <h2 id="home-orders-title" className="text-lg font-black sm:text-xl">Últimos pedidos</h2>
    <ClipboardList size={HOME_ICON_SIZE} strokeWidth={HOME_ICON_STROKE} className="shrink-0 text-gold-deep" aria-hidden="true" />
   </div>
   {isLoading ? <p role="status" className="py-6 text-center text-sm">Carregando pedidos…</p>
    : isError ? <p role="alert" className="py-6 text-center text-sm">Não foi possível carregar os pedidos.</p>
    : data?.recentOrders.length ? <ul className="divide-y divide-border">
      {data.recentOrders.map(order => {
       const snapshot = order.customer_snapshot ?? {};
       const customerName = String(snapshot["trade_name"] ?? snapshot["company_name"] ?? snapshot["name"] ?? "Cliente");
       return <li key={order.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
        <div className="min-w-0">
         <strong className="block text-sm">Pedido #{order.number}</strong>
         <span className="block truncate text-xs text-muted-foreground">{customerName}</span>
         <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs font-bold text-navy">{statusLabels[order.status ?? ""] ?? "Registrado"}</span>
       </li>;
      })}
     </ul>
    : <p className="py-6 text-center text-sm text-muted-foreground">Ainda não há pedidos registrados neste período.</p>}
   <Link to="/pedidos" className="mt-2 flex items-center justify-end gap-1 text-sm font-bold text-navy-soft hover:underline">Ver todos os pedidos <ChevronRight size={16} strokeWidth={HOME_ICON_STROKE} aria-hidden="true" /></Link>
  </section>
 );
}
