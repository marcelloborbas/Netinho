import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

type AdminOrder = {
  id: string;
  seller_id: string | null;
  number: number;
  created_at: string;
  total: number | null;
  status: string;
  kind: string;
  customer_snapshot: unknown;
};

/** Nome do cliente gravado no pedido (snapshot), quando houver. */
function customerName(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const value = snapshot as { trade_name?: unknown; company_name?: unknown };
  return String(value.trade_name || value.company_name || "");
}

/** Todos os pedidos e orçamentos, com filtro por usuário e busca por número ou cliente. */
export function OrdersSection() {
  const { data: me } = useQuery(meQuery);
  const [selected, setSelected] = useState("todos");
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-orders-users"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const {
    data: orders = [],
    isLoading: loadingOrders,
    error: ordersError,
  } = useQuery({
    queryKey: ["admin-all-orders"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const all: AdminOrder[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase
          .from("orders")
          .select("id,seller_id,number,created_at,total,status,kind,customer_snapshot")
          .order("created_at", { ascending: false })
          .range(from, from + 499);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
      return all;
    },
  });
  const term = search.trim().toLowerCase();
  const visible = orders.filter(
    (o) =>
      (selected === "todos" || o.seller_id === selected) &&
      (!term ||
        String(o.number).includes(term) ||
        customerName(o.customer_snapshot).toLowerCase().includes(term)),
  );
  const sum = visible
    .filter((o) => o.kind !== "orcamento" && o.status !== "cancelled")
    .reduce((n, o) => n + Number(o.total ?? 0), 0);
  const userName = (id: string | null) => {
    const user = users.find((u) => u.id === id);
    return user?.full_name || user?.email || (id ? "Usuário não identificado" : "Sem usuário");
  };
  return (
    <div className="space-y-3 text-navy">
      <AdminSectionHeader
        icon={ClipboardList}
        title="Pedidos"
        description="Pedidos e orçamentos de toda a equipe"
        stats={[{ label: "Total (sem orçamentos e cancelados)", value: brl(sum) }]}
      />
      <section
        aria-label="Filtrar pedidos"
        className="grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_260px]"
      >
        <label className="relative block">
          <span className="sr-only">Buscar pedido</span>
          <Search
            size={18}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            aria-label="Buscar pedido"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número ou cliente..."
            className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="sr-only">Usuário</span>
          <select
            aria-label="Filtrar por usuário"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          >
            <option value="todos">Todos os usuários</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          <strong className="text-navy">{visible.length}</strong> registro(s). Status e
          cancelamentos são alterados na ficha do pedido.
        </p>
      </section>
      {(loadingUsers || loadingOrders) && <p className="p-2 text-sm">Carregando pedidos…</p>}
      {ordersError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          Não foi possível consultar os pedidos. Verifique as permissões administrativas do banco.
        </p>
      )}
      {!loadingOrders && !ordersError && visible.length === 0 && (
        <p className="rounded-xl bg-card p-4 text-sm">Nenhum pedido encontrado para este filtro.</p>
      )}
      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {visible.map((o) => (
          <li
            key={o.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                <UserRound size={15} aria-hidden="true" />
                {userName(o.seller_id)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Nº {o.number} · {new Date(o.created_at).toLocaleDateString("pt-BR")} ·{" "}
                {o.kind === "orcamento" ? "Orçamento" : "Pedido"}
                {customerName(o.customer_snapshot) ? ` · ${customerName(o.customer_snapshot)}` : ""}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-sm">
                <strong>{brl(Number(o.total ?? 0))}</strong>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold">
                  {o.status}
                </span>
              </p>
            </div>
            <Link
              to="/pedidos/$id"
              params={{ id: o.id }}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy px-3 text-xs font-bold text-navy-foreground hover:bg-navy-soft"
            >
              <ClipboardList size={16} aria-hidden="true" />
              Abrir
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
