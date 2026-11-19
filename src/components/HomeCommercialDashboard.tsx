import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import {
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME_ICON_STROKE, HomeIconTile } from "@/components/HomeIconTile";

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

/** Tipo 1: painel compacto com velocímetro e barras, sem deformar no mobile. */
function SalesChart({ periods }: { periods: DashboardData["periods"] }) {
  const max = Math.max(1, ...periods.map(p => p.total));
  const previous = periods[periods.length - 2]?.total ?? 0;
  const current = periods[periods.length - 1]?.total ?? 0;
  const rising = current > previous;
  const falling = current < previous;
  const color = rising ? "#168544" : falling ? "#c62c35" : "#a37b1b";
  const variation = previous > 0 ? (current - previous) / previous * 100 : null;
  const label = rising ? "Em crescimento" : falling ? "Em queda" : "Estável";
  // Ponteiro: indicador de tendência, não escala monetária ou percentual absoluto.
  const needleAngle = rising ? 55 : falling ? -55 : 0;
  return <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] items-center gap-2 sm:gap-4" aria-label={`Evolução das vendas. ${periods.map(p => `${p.label}: ${brl(p.total)}`).join("; ")}. ${label}.`}>
    <div className="flex min-w-0 flex-col items-center justify-center gap-0.5">
      <div className="relative w-full max-w-[145px]">
        <svg viewBox="0 0 180 112" className="block h-auto w-full" role="img" aria-label={`Indicador de tendência: ${label}`}>
          <defs><linearGradient id="netinho-gauge" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#c62c35"/><stop offset="47%" stopColor="#e9bb42"/><stop offset="100%" stopColor="#168544"/></linearGradient></defs>
          <path d="M 22 94 A 68 68 0 0 1 158 94" fill="none" stroke="#d7dce5" strokeWidth="15" strokeLinecap="round"/>
          <path d="M 22 94 A 68 68 0 0 1 158 94" fill="none" stroke="url(#netinho-gauge)" strokeWidth="12" strokeLinecap="round"/>
          <g transform={`rotate(${needleAngle} 90 94)`}><path d="M 90 94 L 84 85 L 90 32 L 96 85 Z" fill="#102a52" stroke="#fff" strokeWidth="1.5"/><circle cx="90" cy="94" r="7" fill="#d4af37" stroke="#102a52" strokeWidth="2"/></g>
        </svg>
      </div>
      <strong className="text-[17px] font-black leading-none tabular-nums sm:text-2xl" style={{color}}>{variation == null ? "—" : `${variation > 0 ? "+" : ""}${variation.toLocaleString("pt-BR",{maximumFractionDigits:1})}%`}</strong>
      <span className="text-center text-[10px] font-extrabold leading-tight sm:text-xs" style={{color}}>{label}</span>
      <span className="text-center text-[9px] leading-tight text-[#50617a]">Em relação ao mês anterior</span>
    </div>
    <div className="flex h-full min-h-0 flex-col justify-end gap-1.5">
      <div className="flex min-h-[82px] flex-1 items-end justify-around gap-2 border-b border-[#d4af37]/60 pb-0.5">
        {periods.map((p,i) => <div key={p.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <strong className="max-w-full truncate text-center text-[10px] font-black tabular-nums text-[#102a52] sm:text-xs" title={brl(p.total)}>{shortMoney(p.total)}</strong>
          <div className="relative w-full max-w-[48px] rounded-t-md border border-[#d4af37]/40 shadow-[inset_-5px_0_9px_rgba(0,0,0,.1)]" style={{height:`${Math.max(p.total>0?9:3,(p.total/max)*70)}%`,background:i===periods.length-1?"linear-gradient(105deg,#b78116,#ffe17a 55%,#c6962b)":"linear-gradient(105deg,#6b8db4,#c2d3e6 55%,#819fbe)"}}/>
        </div>)}
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">{periods.map(p=><span key={p.key} className="text-[10px] font-bold text-[#102a52] sm:text-xs">{p.label}</span>)}</div>
    </div>
  </div>;
}

const panelTitle = "truncate text-sm font-black leading-tight lg:text-base";
const panelLink = "flex shrink-0 items-center justify-end gap-1 text-xs font-bold text-navy-soft hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy";

function SalesSummary() {
  const { data, isPending, isError, isAdmin } = useHomeDashboard();
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <h3 className={cn(panelTitle, "block text-center text-[#102a52]")}>
        {isAdmin ? "Evolução das Vendas" : "Minhas Vendas"} <span className="text-[11px] font-bold text-gold-deep">· últimos 3 meses</span>
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
