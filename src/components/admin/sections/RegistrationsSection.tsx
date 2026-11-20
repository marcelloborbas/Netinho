import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";

type RegistrationRequest = {
  id: string;
  applicant_type: string;
  form_data: Record<string, string>;
  status: string;
  created_at: string;
};
const STATUSES = ["recebido", "em_analise", "pendente", "aprovado", "recusado"] as const;
const label = (status: string) => status.replaceAll("_", " ");

/** Solicitações enviadas pelo Cadastro Digital, com mudança de situação. */
export function RegistrationsSection() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const {
    data: rows = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-registration-requests"],
    enabled: !!me?.isAdmin,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_requests" as never)
        .select("id,applicant_type,form_data,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RegistrationRequest[];
    },
  });
  async function update(id: string, status: string) {
    setUpdating(id);
    setUpdateError("");
    setUpdateSuccess("");
    const { error: rpcError } = await supabase.rpc(
      "review_registration_request" as never,
      { p_request_id: id, p_status: status } as never,
    );
    setUpdating(null);
    if (rpcError) {
      setUpdateError("Não foi possível alterar a situação: " + rpcError.message);
      return;
    }
    const request = rows.find((row) => row.id === id);
    setUpdateSuccess(status === "aprovado" ? request?.applicant_type === "cliente" ? "Cadastro de cliente aprovado. O acesso permanece como Visitante; esta aprovação não cria automaticamente um cliente comercial nem libera vendas." : "Cadastro aprovado. O perfil de acesso foi atualizado; o usuário pode precisar entrar novamente para ver as novas permissões." : `Situação alterada para ${label(status)}.`);
    void qc.invalidateQueries({ queryKey: ["me"] });
    qc.setQueryData<RegistrationRequest[]>(["admin-registration-requests"], (old) =>
      old?.map((row) => (row.id === id ? { ...row, status } : row)),
    );
  }
  const visible = rows.filter((row) => filter === "todos" || row.status === filter);
  const open = rows.filter((row) => !["aprovado", "recusado"].includes(row.status)).length;
  return (
    <div className="space-y-3 text-navy">
      <header className="rounded-2xl bg-[#102a52] px-4 py-4 text-center shadow-md">
        <h1 className="text-xl font-black uppercase tracking-wide text-white sm:text-2xl">CADASTROS RECEBIDOS</h1>
      </header>
      <div className="flex items-center justify-end gap-3">
        {!error && <span className="text-sm font-bold">Em aberto: {open}</span>}
        <button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#102a52] px-4 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={15} aria-hidden="true" className={isFetching ? "animate-spin" : ""}/>Atualizar</button>
      </div>
      {isLoading && <p className="p-2 text-sm">Carregando solicitações…</p>}
      {error && (
        <p role="alert" className="rounded-xl border border-gold/60 bg-gold-soft/40 p-3 text-sm">
          Não foi possível consultar as solicitações. O armazenamento de cadastros recebidos não
          está disponível no banco de dados ({error.message}).
        </p>
      )}
      {updateSuccess && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{updateSuccess}</p>}
      {updateError && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {updateError}
        </p>
      )}
      {!error && !isLoading && (
        <>
          <label className="flex items-center gap-2 text-sm font-bold">
            Situação
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-10 rounded-xl border border-border bg-background px-3 font-semibold"
            >
              <option value="todos">Todas</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          {visible.length === 0 && (
            <p className="rounded-xl bg-card p-4 text-sm">Nenhuma solicitação encontrada.</p>
          )}
          <ul className="space-y-2">
            {visible.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{row.form_data["razao_social"] || "Solicitante"}</strong>
                  <span className="text-xs text-muted-foreground">
                    {row.applicant_type} · {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="my-1 break-all text-[11px] text-muted-foreground">
                  Protocolo: {row.id}
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer font-semibold">Ver dados enviados</summary>
                  <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.entries(row.form_data).map(([key, value]) => (
                      <div key={key} className="break-words">
                        <dt className="font-semibold">{label(key)}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
                <label className="mt-2 block text-sm font-semibold">
                  Situação
                  <select
                    value={row.status}
                    disabled={updating === row.id}
                    onChange={(e) => void update(row.id, e.target.value)}
                    className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-2"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {label(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  A aprovação libera o perfil correspondente. Comissões e condições comerciais são
                  definidas em Pessoas e Comissões.
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
