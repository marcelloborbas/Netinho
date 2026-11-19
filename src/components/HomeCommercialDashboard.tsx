import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import {
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeIconTile } from "@/components/HomeIconTile";

const periodKey = (date: Date) => {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return p.find((x) => x.type === "year")?.value + "-" + p.find((x) => x.type === "month")?.value;
};
const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
async function loadDashboard(isAdmin: boolean, expectedUserId: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user || auth.user.id !== expectedUserId) return null;
  const now = new Date();
  const current = periodKey(now);
  const [year = now.getFullYear(), month = now.getMonth() + 1] = current.split("-").map(Number);
  const periods = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 3 + i, 15));
    return {
      key: d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"),
      label: names[d.getUTCMonth()],
      total: 0,
    };
  });
  const start = new Date(Date.UTC(year, month - 3, 1) - 86400000).toISOString();
  const end = new Date(Date.UTC(year, month, 1) + 86400000).toISOString();
  // A comissão deve ser consultada também para o administrador.
  // A ausência de registro não equivale a comissão zero.
  const { data: rateRow, error: rateError } = await supabase
    .from("salesperson_commission_rates" as never)
    .select("rate")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (rateError) throw rateError;
  const registeredRate = (rateRow as { rate?: number } | null)?.rate;
  const rate = registeredRate == null ? (isAdmin ? 3.5 : null) : Number(registeredRate);
  const allOrders = [] as Array<{
    id: string;
    number: number;
    seller_id: string | null;
    customer_id: string | null;
    customer_snapshot: Record<string, unknown> | null;
    created_at: string;
    total: number | null;
    kind: string | null;
    status: string | null;
  }>;
  for (let offset = 0; ; offset += 500) {
    let query = supabase
      .from("orders")
      .select("id,number,seller_id,customer_id,customer_snapshot,created_at,total,kind,status")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at")
      .range(offset, offset + 499);
    if (!isAdmin) query = query.eq("seller_id", auth.user.id);
    const { data, error } = await query;
    if (error) throw error;
    allOrders.push(...((data ?? []) as unknown as typeof allOrders));
    if ((data ?? []).length < 500) break;
  }
  for (const order of allOrders) {
    if (order.kind === "orcamento" || order.status === "cancelled") continue;
    const p = periods.find((x) => x.key === periodKey(new Date(order.created_at)));
    if (p) p.total += Number(order.total ?? 0);
  }
  const currentTotal = periods[2]?.total ?? 0;
  const validOrders = allOrders.filter(
    (order) => order.kind !== "orcamento" && order.status !== "cancelled",
  );
  const currentOrders = validOrders.filter(
    (order) => periodKey(new Date(order.created_at)) === periods[2]?.key,
  );
  const orderCount = currentOrders.length;
  const clientCount = new Set(
    currentOrders.map((order) => order.customer_id).filter((id): id is string => !!id),
  ).size;
  const previousTotal = periods[1]?.total ?? 0;
  const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  const recentOrders = [...validOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);
  return {
    periods,
    currentTotal,
    commission: rate == null ? null : (currentTotal * rate) / 100,
    rate,
    orderCount,
    clientCount,
    growth,
    recentOrders,
  };
}
type DashboardData = NonNullable<Awaited<ReturnType<typeof loadDashboard>>>;

/** Consulta única do painel; a mesma chave de cache atende as abas de vendas e pedidos. */
function useHomeDashboard() {
  const { data: me } = useQuery(meQuery);
  const isAdmin = me?.isAdmin === true;
  const query = useQuery({
    queryKey: ["netinho-home-commercial-dashboard", me?.id, isAdmin],
    queryFn: () => loadDashboard(isAdmin, me!.id),
    enabled: !!me?.id,
    staleTime: 120000,
    retry: false,
  });
  return { ...query, isAdmin };
}

interface KpiProps {
  icon: LucideIcon;
  label: string;
  value: string;
  fullValue?: string | undefined;
}

/** Indicador do painel azul-marinho: ícone dourado, rótulo curto e valor em destaque. */
function Kpi({ icon, label, value, fullValue }: KpiProps) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-xl bg-navy-foreground/5 px-2 py-1.5 ring-1 ring-inset ring-gold/25">
      <HomeIconTile icon={icon} size="sm" />
      <span className="min-w-0 leading-tight">
        <small className="block truncate text-[11px] font-semibold text-navy-foreground/75">
          {label}
        </small>
        <strong
          className="block truncate text-sm font-black tabular-nums text-navy-foreground lg:text-base"
          title={fullValue ?? value}
        >
          {value}
        </strong>
      </span>
    </li>
  );
}

const shortMoney = (total: number) =>
  total >= 1000
    ? `R$ ${(total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : brl(total);

/** Faixa de indicadores essenciais do mês: 2×2 no celular, 4 colunas no computador. */
export function HomeKpis({ className }: { className?: string }) {
  const { data, isPending, isError } = useHomeDashboard();
  // "Pendente" cobre também a espera pelo perfil, quando a consulta ainda não começou.
  const waiting = isPending === true;
  const placeholder = waiting ? "…" : "—";
  const ready = !waiting && !isError;
  const count = (value: number | undefined) =>
    ready ? (value ?? 0).toLocaleString("pt-BR") : placeholder;
  const growth =
    ready && data?.growth != null
      ? `${data.growth > 0 ? "+" : ""}${data.growth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
      : placeholder;
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-gold/40 bg-navy-deep p-1.5 shadow-home-card",
        className,
      )}
      aria-labelledby="home-kpis-title"
    >
      <h2 id="home-kpis-title" className="sr-only">
        Indicadores do mês
      </h2>
      <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-4" aria-busy={waiting || undefined}>
        <Kpi
          icon={ChartNoAxesColumnIncreasing}
          label="Vendas no mês"
          value={ready ? shortMoney(data?.currentTotal ?? 0) : placeholder}
          fullValue={ready ? brl(data?.currentTotal ?? 0) : undefined}
        />
        <Kpi icon={ClipboardList} label="Pedidos no mês" value={count(data?.orderCount)} />
        <Kpi icon={Users} label="Clientes atendidos" value={count(data?.clientCount)} />
        <Kpi
          icon={TrendingUp}
          label="Crescimento"
          value={growth}
          fullValue={
            ready && data?.growth != null ? `${growth} em relação ao mês anterior` : undefined
          }
        />
      </ul>
      {isError && (
        <p role="alert" className="px-1 pt-1 text-[11px] text-navy-foreground/80">
          Não foi possível atualizar os indicadores.
        </p>
      )}
    </section>
  );
}

/** Evolução mensal com curva direcional: verde em alta, vermelho em queda. */
function SalesChart({ periods }: { periods: DashboardData["periods"] }) {
  const max = Math.max(1, ...periods.map((p) => p.total));
  const previous = periods[periods.length - 2]?.total ?? 0;
  const current = periods[periods.length - 1]?.total ?? 0;
  const rising = current > previous;
  const falling = current < previous;
  const trendColor = rising ? "#159447" : falling ? "#d32f2f" : "#b28a21";
  const points = periods.map((p, i) => ({ x: 12 + i * 38, y: 78 - (p.total / max) * 58 }));
  const a = points[0] ?? { x: 12, y: 78 };
  const b = points[1] ?? a;
  const d = points[2] ?? b;
  const path = `M ${a.x} ${a.y} Q ${(a.x+b.x)/2} ${Math.min(a.y,b.y)-12} ${b.x} ${b.y} Q ${(b.x+d.x)/2} ${Math.min(b.y,d.y)-12} ${d.x} ${d.y}`;
  const angle = Math.atan2(d.y-b.y,d.x-b.x);
  const headA = {x:d.x-10*Math.cos(angle-0.55),y:d.y-10*Math.sin(angle-0.55)};
  const headB = {x:d.x-10*Math.cos(angle+0.55),y:d.y-10*Math.sin(angle+0.55)};
  return <div className="flex min-h-0 flex-1 flex-col justify-center gap-1" role="img" aria-label={`Evolução de vendas: ${periods.map(p=>`${p.label}: ${brl(p.total)}`).join("; ")}. ${rising?"Em alta":falling?"Em queda":"Estável"} em relação ao mês anterior.`}>
    <svg viewBox="0 0 100 92" preserveAspectRatio="none" className="h-full min-h-[75px] max-h-[180px] w-full overflow-visible" aria-hidden="true">
      <path d="M 0 82 H 100" stroke="#d4af37" strokeOpacity=".45" strokeWidth=".8" />
      {points.map((pt,i)=><rect key={periods[i]?.key} x={pt.x-7} y={pt.y} width="14" height={82-pt.y} rx="2" fill={i===2?"#d4af37":"#93b1d0"} opacity=".6" />)}
      <path d={path} fill="none" stroke={trendColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={`M ${headA.x} ${headA.y} L ${d.x} ${d.y} L ${headB.x} ${headB.y}`} fill="none" stroke={trendColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {points.map((pt,i)=><circle key={periods[i]?.key} cx={pt.x} cy={pt.y} r="2.3" fill={trendColor} stroke="white" strokeWidth=".8" />)}
    </svg>
    <div className="grid grid-cols-3 gap-1 text-center">{periods.map(p=><div key={p.key} className="min-w-0"><span className="block text-[10px] font-bold">{p.label}</span><strong className="block truncate text-[10px] tabular-nums sm:text-xs" title={brl(p.total)}>{shortMoney(p.total)}</strong></div>)}</div>
    <p className="text-center text-xs font-black" style={{color:trendColor}}>{rising?"↗ Vendas em alta":falling?"↘ Vendas em queda":"→ Vendas estáveis"}{previous>0?` · ${((current-previous)/previous*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}%`:""}</p>
  </div>;
}

const panelTitle = "truncate text-sm font-black leading-tight lg:text-base";

function SalesSummary() {
  const { data, isPending, isError, isAdmin } = useHomeDashboard();
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <h3 className={cn(panelTitle, "hidden lg:block")}>
        {isAdmin ? "Evolução de todas as vendas" : "Evolução das minhas vendas"} <span className="text-[11px] font-bold text-gold-deep">· 3 meses</span>
      </h3>
      {isPending ? (
        <p role="status" className="grid flex-1 place-items-center text-xs text-muted-foreground">
          Carregando vendas…
        </p>
      ) : isError ? (
        <p role="alert" className="grid flex-1 place-items-center text-xs">
          Não foi possível consultar as vendas.
        </p>
      ) : (
        <SalesChart periods={data?.periods ?? []} />
      )}
      {isAdmin && (
        <Link to="/vendas-por-representante" className={panelLink}>
          Ver por representante{" "}
          <ChevronRight size={14} strokeWidth={HOME_ICON_STROKE} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Painel inicial dedicado à evolução, sem abas de Vendas e Pedidos. */
export function HomeSalesPanel({ className }: { className?: string }) {
  return <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-2.5 text-navy shadow-home-card lg:p-3",className)} aria-label="Evolução das vendas">
    <SalesSummary />
  </section>;
}
