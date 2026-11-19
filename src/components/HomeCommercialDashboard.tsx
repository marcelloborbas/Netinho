import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { ChartNoAxesColumnIncreasing, ChevronRight, ClipboardList, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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

/** Consulta única do painel; a mesma chave de cache atende as abas de vendas e pedidos. */
function useHomeDashboard() {
 const { data: me } = useQuery(meQuery);
 const isAdmin = me?.isAdmin === true;
 const query = useQuery({ queryKey: ["netinho-home-commercial-dashboard", isAdmin], queryFn: () => loadDashboard(isAdmin), enabled: !!me, staleTime: 120000, retry: false });
 return { ...query, isAdmin };
}

interface KpiProps { icon: LucideIcon; label: string; value: string; fullValue?: string | undefined }

function Kpi({ icon, label, value, fullValue }: KpiProps) {
 return (
  <li className="flex min-w-0 items-center gap-2 rounded-xl border border-gold/40 bg-card px-2 py-1.5">
   <HomeIconTile icon={icon} size="sm" />
   <span className="min-w-0">
    <small className="block truncate text-[11px] font-semibold leading-tight text-muted-foreground">{label}</small>
    <strong className="block truncate text-sm font-black tabular-nums leading-tight" title={fullValue ?? value}>{value}</strong>
   </span>
  </li>
 );
}

const shortMoney = (total: number) => total >= 1000 ? `R$ ${(total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl(total);

/** Gráfico de barras compacto: ocupa o espaço restante do painel, sem altura fixa. */
function SalesChart({ periods }: { periods: DashboardData["periods"] }) {
 const max = Math.max(1, ...periods.map(p => p.total));
 return (
  <ol className="grid min-h-0 flex-1 grid-cols-3 items-end gap-3 px-1" aria-label={`Vendas dos últimos 3 meses: ${periods.map(p => `${p.label}: ${brl(p.total)}`).join("; ")}`}>
   {periods.map((p, index) => (
    <li key={p.key} className="flex h-full min-h-0 min-w-0 flex-col items-center justify-end gap-0.5">
     <span className="max-w-full truncate text-[10px] font-black tabular-nums" title={brl(p.total)}>{shortMoney(p.total)}</span>
     <span aria-hidden="true" className={`block min-h-[3px] w-full max-w-16 rounded-t-md ${index === periods.length - 1 ? "bg-gold" : "bg-navy-soft"}`} style={{ height: `${Math.max(4, p.total / max * 70)}%` }} />
     <span className="text-[10px] font-bold leading-none">{p.label}</span>
    </li>
   ))}
  </ol>
 );
}

function SalesSummary() {
 const { data, isLoading, isError, isAdmin } = useHomeDashboard();
 const placeholder = isLoading ? "…" : "—";
 const ready = !isLoading && !isError;
 const count = (value: number | undefined) => ready ? (value ?? 0).toLocaleString("pt-BR") : placeholder;
 const growth = ready && data?.growth != null ? `${data.growth > 0 ? "+" : ""}${data.growth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : placeholder;
 return (
  <div className="flex h-full min-h-0 flex-col gap-2">
   <ul className="grid shrink-0 grid-cols-2 gap-1.5" aria-label="Indicadores do mês">
    <Kpi icon={ChartNoAxesColumnIncreasing} label="Vendas no mês" value={ready ? shortMoney(data?.currentTotal ?? 0) : placeholder} fullValue={ready ? brl(data?.currentTotal ?? 0) : undefined} />
    <Kpi icon={ClipboardList} label="Pedidos no mês" value={count(data?.orderCount)} />
    <Kpi icon={Users} label="Clientes atendidos" value={count(data?.clientCount)} />
    <Kpi icon={TrendingUp} label="Crescimento" value={growth} />
   </ul>
   {isLoading ? <p role="status" className="grid flex-1 place-items-center text-xs">Carregando vendas…</p>
    : isError ? <p role="alert" className="grid flex-1 place-items-center text-xs">Não foi possível consultar as vendas.</p>
    : <SalesChart periods={data?.periods ?? []} />}
   {isAdmin && <Link to="/vendas-por-representante" className="flex shrink-0 items-center justify-end gap-1 text-xs font-bold text-navy-soft hover:underline">Ver por representante <ChevronRight size={14} strokeWidth={HOME_ICON_STROKE} aria-hidden="true" /></Link>}
  </div>
 );
}

const statusLabels: Record<string, string> = { sent: "Enviado", received: "Recebido", processing: "Em separação", invoiced: "Faturado", cancelled: "Cancelado" };

function RecentOrders() {
 const { data, isLoading, isError } = useHomeDashboard();
 const orders = data?.recentOrders ?? [];
 return (
  <div className="flex h-full min-h-0 flex-col gap-1">
   {isLoading ? <p role="status" className="grid flex-1 place-items-center text-xs">Carregando pedidos…</p>
    : isError ? <p role="alert" className="grid flex-1 place-items-center text-xs">Não foi possível carregar os pedidos.</p>
    : orders.length ? <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
      {orders.map(order => {
       const snapshot = order.customer_snapshot ?? {};
       const customerName = String(snapshot["trade_name"] ?? snapshot["company_name"] ?? snapshot["name"] ?? "Cliente");
       return <li key={order.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5">
        <div className="min-w-0 leading-tight">
         <strong className="block text-xs">Pedido #{order.number} · <span className="font-semibold text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span></strong>
         <span className="block truncate text-[11px] text-muted-foreground">{customerName}</span>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-navy">{statusLabels[order.status ?? ""] ?? "Registrado"}</span>
       </li>;
      })}
     </ul>
    : <p className="grid flex-1 place-items-center text-center text-xs text-muted-foreground">Ainda não há pedidos registrados neste período.</p>}
   <Link to="/pedidos" className="flex shrink-0 items-center justify-end gap-1 text-xs font-bold text-navy-soft hover:underline">Ver todos os pedidos <ChevronRight size={14} strokeWidth={HOME_ICON_STROKE} aria-hidden="true" /></Link>
  </div>
 );
}

const tabTrigger = "h-7 rounded-md px-2.5 text-xs font-bold text-navy-foreground/80 data-[state=active]:bg-gold data-[state=active]:text-gold-foreground data-[state=active]:shadow-none";

/** Painel compacto: abas de Vendas e Últimos pedidos dentro do mesmo espaço da tela. */
export function HomeSalesPanel({ className }: { className?: string }) {
 return (
  <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-2.5 text-navy shadow-home-card", className)} aria-labelledby="home-sales-title">
   <Tabs defaultValue="vendas" className="flex min-h-0 flex-1 flex-col">
    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
     <h2 id="home-sales-title" className="truncate text-base font-black leading-tight">Evolução das vendas <span className="text-[11px] font-bold text-gold-deep">· 3 meses</span></h2>
     <TabsList className="h-8 rounded-lg bg-navy p-0.5">
      <TabsTrigger value="vendas" className={tabTrigger}>Vendas</TabsTrigger>
      <TabsTrigger value="pedidos" className={tabTrigger}>Pedidos</TabsTrigger>
     </TabsList>
    </div>
    <TabsContent value="vendas" className="mt-2 min-h-0 flex-1 data-[state=inactive]:hidden"><SalesSummary /></TabsContent>
    <TabsContent value="pedidos" className="mt-2 min-h-0 flex-1 data-[state=inactive]:hidden"><RecentOrders /></TabsContent>
   </Tabs>
  </section>
 );
}
