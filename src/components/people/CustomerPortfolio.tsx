import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, BriefcaseBusiness, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  customerAssignmentRepresentativesQuery,
  customersQuery,
  type Customer,
} from "@/lib/queries";

export interface CustomerPortfolioProps {
  /** ID da conta (auth) dona da carteira — corresponde a `customers.seller_id`. */
  ownerId: string;
  ownerName: string;
  /** Só carrega dados quando a aba estiver aberta. */
  enabled: boolean;
}

type AssignmentRepresentative = {
  user_id: string;
  full_name: string;
  email: string;
  active: boolean;
};

/** Regra do RLS de `customers`: o destino precisa ser representante ativo e vinculado a uma conta. */
export function canReceiveCustomers(
  representatives: AssignmentRepresentative[],
  userId: string,
): boolean {
  return representatives.some((r) => r.user_id === userId && r.active);
}

const customerLabel = (c: Customer) => c.trade_name || c.company_name;

/**
 * Carteira de clientes de uma pessoa, com atribuição e transferência.
 * A tela PESSOAL é exclusiva do administrador; mesmo assim, toda gravação passa
 * pelo RLS de `customers`, que restringe representantes à própria carteira.
 */
export function CustomerPortfolio({ ownerId, ownerName, enabled }: CustomerPortfolioProps) {
  const qc = useQueryClient();
  const { data: customers = [], isLoading, error } = useQuery({ ...customersQuery, enabled });
  const {
    data: representatives = [],
    isLoading: repsLoading,
    error: repsError,
  } = useQuery({ ...customerAssignmentRepresentativesQuery, enabled });
  const [search, setSearch] = useState("");
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [incoming, setIncoming] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const names = useMemo(
    () => new Map(representatives.map((r) => [r.user_id, r.full_name])),
    [representatives],
  );
  const term = search.trim().toLowerCase();
  const own = customers.filter((c) => c.seller_id === ownerId);
  const visibleOwn = term
    ? own.filter((c) =>
        [c.company_name, c.trade_name, c.cnpj, c.city].some((v) => v?.toLowerCase().includes(term)),
      )
    : own;
  const others = customers.filter((c) => c.seller_id !== ownerId);
  const ownerCanReceive = canReceiveCustomers(representatives, ownerId);
  const destinations = representatives.filter((r) => r.active && r.user_id !== ownerId);

  async function move(customer: Customer, toUserId: string) {
    if (busyId) return;
    if (!canReceiveCustomers(representatives, toUserId)) {
      toast.error("O destino precisa ser um representante ativo com conta vinculada.");
      return;
    }
    const toName = names.get(toUserId) ?? "o representante selecionado";
    if (!window.confirm(`Transferir ${customerLabel(customer)} para ${toName}?`)) return;
    setBusyId(customer.id);
    // O filtro pelo responsável atual evita sobrescrever uma transferência feita por outra pessoa.
    const { data, error: updateError } = await supabase
      .from("customers")
      .update({ seller_id: toUserId })
      .eq("id", customer.id)
      .eq("seller_id", customer.seller_id)
      .select("id")
      .maybeSingle();
    setBusyId(null);
    if (updateError) {
      toast.error(
        updateError.code === "42501"
          ? "Sem permissão para alterar a carteira deste cliente."
          : "Não foi possível transferir: " + updateError.message,
      );
      return;
    }
    if (!data) {
      toast.error(
        "Transferência não confirmada. O cliente pode ter mudado de responsável; a lista será atualizada.",
      );
      void qc.invalidateQueries({ queryKey: ["customers"] });
      return;
    }
    toast.success(`${customerLabel(customer)} agora está na carteira de ${toName}.`);
    setTargets((t) => {
      const next = { ...t };
      delete next[customer.id];
      return next;
    });
    setIncoming("");
    await qc.invalidateQueries({ queryKey: ["customers"] });
  }

  if (isLoading || repsLoading)
    return <p className="text-sm text-muted-foreground">Carregando carteira…</p>;
  if (error || repsError)
    return (
      <p role="alert" className="text-sm font-semibold text-destructive">
        Não foi possível carregar a carteira de clientes.
      </p>
    );

  return (
    <div className="space-y-4 text-sm text-navy">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-black">
          <BriefcaseBusiness size={18} className="text-gold-deep" aria-hidden="true" />
          Clientes de {ownerName}
        </h3>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
          {own.length} cliente(s)
        </span>
      </div>

      {own.length > 5 && (
        <label className="relative block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            aria-label="Buscar cliente na carteira"
            placeholder="Buscar por nome, CNPJ ou cidade"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3"
          />
        </label>
      )}

      {own.length === 0 ? (
        <p className="rounded-lg bg-muted p-3 text-muted-foreground">
          Nenhum cliente nesta carteira.
        </p>
      ) : (
        <ul
          className="max-h-80 space-y-2 overflow-y-auto pr-1"
          aria-label={`Carteira de ${ownerName}`}
        >
          {visibleOwn.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-background p-3">
              <div className="min-w-0">
                <strong className="block truncate">{customerLabel(c)}</strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {[c.cnpj, c.city && `${c.city}/${c.state ?? ""}`].filter(Boolean).join(" · ") ||
                    "Sem CNPJ/cidade"}
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label={`Novo responsável por ${customerLabel(c)}`}
                  value={targets[c.id] ?? ""}
                  disabled={busyId !== null || destinations.length === 0}
                  onChange={(e) => setTargets((t) => ({ ...t, [c.id]: e.target.value }))}
                  className="min-h-10 w-full rounded-lg border border-border bg-background px-2 text-xs sm:flex-1"
                >
                  <option value="">
                    {destinations.length ? "Transferir para…" : "Nenhum outro representante ativo"}
                  </option>
                  {destinations.map((r) => (
                    <option key={r.user_id} value={r.user_id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!targets[c.id] || busyId !== null}
                  onClick={() => void move(c, targets[c.id] ?? "")}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-navy px-3 text-xs font-bold text-navy disabled:opacity-40"
                >
                  <ArrowRightLeft size={15} aria-hidden="true" />
                  {busyId === c.id ? "Transferindo…" : "Transferir"}
                </button>
              </div>
            </li>
          ))}
          {visibleOwn.length === 0 && (
            <li className="text-muted-foreground">Nenhum cliente encontrado para “{search}”.</li>
          )}
        </ul>
      )}

      <section className="space-y-2 rounded-xl border border-gold-soft bg-gold-soft/30 p-3">
        <h4 className="flex items-center gap-2 font-black">
          <UserPlus size={16} className="text-gold-deep" aria-hidden="true" />
          Atribuir cliente a esta carteira
        </h4>
        {ownerCanReceive ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              aria-label={`Cliente para atribuir a ${ownerName}`}
              value={incoming}
              disabled={busyId !== null || others.length === 0}
              onChange={(e) => setIncoming(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-border bg-background px-2 text-xs sm:flex-1"
            >
              <option value="">
                {others.length
                  ? "Selecione um cliente de outra carteira"
                  : "Não há clientes em outras carteiras"}
              </option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {customerLabel(c)} — Resp.: {names.get(c.seller_id) ?? "não identificado"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!incoming || busyId !== null}
              onClick={() => {
                const c = others.find((x) => x.id === incoming);
                if (c) void move(c, ownerId);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-navy px-3 text-xs font-bold text-navy-foreground disabled:opacity-40"
            >
              <UserPlus size={15} aria-hidden="true" />
              Atribuir
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Para receber clientes, esta pessoa precisa ter cadastro comercial ativo vinculado à
            conta de acesso (perfil Representante ativo).
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Cada cliente pertence a um único representante. O representante só vê a própria carteira;
          o administrador vê e transfere todas.
        </p>
      </section>
    </div>
  );
}
