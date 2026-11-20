import { Link, useLocation } from "@tanstack/react-router";
import { normalizeHash } from "@/lib/admin-sections";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, customersQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PersonEditorFrame,
  PersonEditorSections,
  usePersonSections,
} from "@/components/people/PersonEditorSections";
import { PersonPhoto, SalesMiniChart } from "@/components/people/PersonVisuals";
import { CustomerPortfolio } from "@/components/people/CustomerPortfolio";
import {
  CommercialAreaDdds,
  parseAreaDdds,
  RepresentativeRecordFields,
  useRepresentativeRecord,
} from "@/components/people/RepresentativeRecord";

type Role = "Visitante" | "Vendedor" | "Representante" | "Administrador";
type Person = {
  id: string;
  full_name: string;
  email: string;
  site_role: Role;
  access_active: boolean;
  territory_uf: string | null;
  territory_cities: string | null;
  supervisor_id: string | null;
  phone: string | null;
};
type CommercialRepresentative = {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  active: boolean;
};
const roles: Role[] = ["Visitante", "Vendedor", "Representante", "Administrador"];
const RATE_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
const formatRate = (rate: number | string) => `${Number(rate).toLocaleString("pt-BR")}%`;
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 font-normal text-foreground";
const labelClass = "block text-sm font-bold text-navy";

/** Comissão individual de uma conta de acesso (compartilhada entre a linha e a ficha). */
const personCommissionQuery = (id: string) => ({
  queryKey: ["person-commission", id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("salesperson_commission_rates" as never)
      .select("rate")
      .eq("user_id", id)
      .maybeSingle();
    if (error) throw error;
    const rate = (data as { rate: number } | null)?.rate;
    return rate ?? null;
  },
});
/** Comissão de um cadastro comercial sem conta vinculada. */
const commercialCommissionQuery = (id: string) => ({
  queryKey: ["commercial-representative-commission", id],
  retry: false,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("commercial_representative_commission_rates" as never)
      .select("rate")
      .eq("representative_id", id)
      .maybeSingle();
    if (error) throw error;
    const rate = (data as { rate: number } | null)?.rate;
    return rate ?? null;
  },
});

/**
 * Pessoas e Comissões: lista compacta com ficha inline. Âncoras aceitas:
 * #novo-representante, #representantes, #person:<uuid>, #representative:<uuid>.
 */
export function PeopleSection() {
  const { data: me, isLoading: loadingMe } = useQuery(meQuery);
  const qc = useQueryClient();
  const hash = normalizeHash(useLocation().hash);
  const [adding, setAdding] = useState(() => hash === "novo-representante");
  const [editing, setEditing] = useState<string | null>(() => {
    const match = hash.match(/^(person|representative):([0-9a-f-]{36})$/i);
    return match ? match[1] + ":" + match[2] : null;
  });
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);
  async function addPerson() {
    if (!newName.trim() || !/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
      toast.error("Informe nome e e-mail válidos.");
      return;
    }
    setCreating(true);
    const { error } = await supabase
      .from("commercial_representatives")
      .insert({ full_name: newName.trim(), email: newEmail.trim().toLowerCase(), active: true });
    setCreating(false);
    if (error) {
      toast.error("Não foi possível adicionar: " + error.message);
      return;
    }
    toast.success(
      "Pessoa adicionada ao cadastro comercial. Para acessar o site, será necessário vincular uma conta de usuário.",
    );
    setAdding(false);
    setNewName("");
    setNewEmail("");
    void qc.invalidateQueries({ queryKey: ["admin-commercial-representatives"] });
  }

  const {
    data: representatives = [],
    isLoading: loadingRepresentatives,
    error: representativesError,
  } = useQuery({
    queryKey: ["admin-commercial-representatives"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_representatives")
        .select("id,user_id,full_name,email,active,phone")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const {
    data: people = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-people"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,full_name,email,site_role,access_active,territory_uf,territory_cities,supervisor_id,phone",
        )
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });
  const { error: ratesError } = useQuery({
    queryKey: ["admin-all-person-commissions"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salesperson_commission_rates" as never)
        .select("user_id,rate");
      if (error) throw error;
      return (data ?? []) as { user_id: string; rate: number }[];
    },
  });
  const { data: commercialRates = [], error: commercialRatesError } = useQuery({
    queryKey: ["admin-all-commercial-commissions"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_representative_commission_rates" as never)
        .select("representative_id,rate");
      if (error) throw error;
      return (data ?? []) as { representative_id: string; rate: number }[];
    },
  });
  const {
    data: monthTotals = {},
    error: monthTotalsError,
    isLoading: monthTotalsLoading,
  } = useQuery({
    queryKey: [
      "admin-monthly-seller-totals",
      new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7),
    ],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const today = new Date();
      const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }).formatToParts(today);
      const y = Number(dateParts.find((p) => p.type === "year")?.value);
      const m = Number(dateParts.find((p) => p.type === "month")?.value);
      const target = y + "-" + String(m).padStart(2, "0");
      const begin = new Date(Date.UTC(y, m - 1, 1) - 86400000).toISOString();
      const finish = new Date(Date.UTC(y, m, 1) + 86400000).toISOString();
      const totals: Record<string, number> = {};
      for (let offset = 0; ; offset += 500) {
        const result = await supabase
          .from("orders")
          .select("seller_id,created_at,total,kind,status")
          .gte("created_at", begin)
          .lt("created_at", finish)
          .order("created_at")
          .range(offset, offset + 499);
        if (result.error) throw result.error;
        for (const order of result.data ?? []) {
          if (!order.seller_id || order.kind === "orcamento" || order.status === "cancelled")
            continue;
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
          }).formatToParts(new Date(order.created_at));
          if (
            parts.find((p) => p.type === "year")?.value +
              "-" +
              parts.find((p) => p.type === "month")?.value !==
            target
          )
            continue;
          totals[order.seller_id] = (totals[order.seller_id] ?? 0) + Number(order.total ?? 0);
        }
        if ((result.data ?? []).length < 500) break;
      }
      return totals;
    },
  });
  const monthlySalesFor = (id: string) =>
    monthTotalsLoading
      ? "Calculando…"
      : monthTotalsError
        ? "Indisponível"
        : (monthTotals[id] ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const linkedCommercialFor = (person: Person) =>
    representatives.find(
      (rep) =>
        (rep.user_id && rep.user_id === person.id) ||
        (!!person.email && rep.email?.trim().toLowerCase() === person.email.trim().toLowerCase()),
    );
  const visibleEntries = [
    ...people
      .map((p) => ({
        kind: "person" as const,
        id: p.id,
        name: p.full_name || "Sem nome",
        record: p,
      })),
    ...representatives
      .filter(
        (rep) =>
          !people.some(
            (p) =>
              (!!rep.user_id && p.id === rep.user_id) ||
              (!!p.email && p.email.trim().toLowerCase() === rep.email?.trim().toLowerCase()),
          ),
      )
      .map((rep) => ({
        kind: "representative" as const,
        id: rep.id,
        name: rep.full_name || "Sem nome",
        record: rep,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const refreshPeople = () => {
    void qc.invalidateQueries({ queryKey: ["admin-people"] });
    void qc.invalidateQueries({ queryKey: ["admin-commercial-representatives"] });
    void qc.invalidateQueries({ queryKey: ["access"] });
    void qc.invalidateQueries({ queryKey: ["admin-all-person-commissions"] });
  };
  const refreshRepresentatives = () => {
    void qc.invalidateQueries({ queryKey: ["admin-commercial-representatives"] });
    void qc.invalidateQueries({ queryKey: ["admin-all-commercial-commissions"] });
  };
  if (loadingMe) return <p className="p-5">Carregando…</p>;
  if (!me?.isAdmin) return <p className="p-5">Acesso restrito ao administrador.</p>;

  return (
    <div className="space-y-3 text-navy">
      {adding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar nova pessoa"
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-navy-deep/60 p-3"
        >
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-card p-5 text-navy shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Adicionar pessoa</h2>
              <button type="button" aria-label="Fechar" onClick={() => setAdding(false)}>
                <X size={22} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Este formulário cria apenas um contato comercial, sem login nem permissões. Para
              atribuir Visitante, Vendedor, Representante ou Administrador, edite uma conta já
              cadastrada na lista.
            </p>
            <label className={labelClass}>
              Nome completo
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              E-mail
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="button"
              disabled={creating}
              onClick={() => void addPerson()}
              className="min-h-12 w-full rounded-lg bg-navy px-4 font-bold text-navy-foreground disabled:opacity-50"
            >
              {creating ? "Adicionando…" : "Adicionar pessoa"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 py-2" aria-label="Ações de pessoas e comissões">
        <Link to="/admin" search={{ secao: "visao-geral" }} className="inline-flex min-h-11 items-center rounded-xl border border-[#102a52]/30 px-4 text-sm font-bold text-[#102a52] hover:bg-[#102a52]/10">Voltar</Link>
        <span className="rounded-xl bg-[#102a52]/10 px-4 py-3 text-sm font-extrabold text-[#102a52]">Cadastros: {visibleEntries.length}</span>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102a52] px-4 text-sm font-extrabold text-white hover:bg-[#173b6e]">
          <UserPlus size={18} aria-hidden="true" />Adicionar pessoa
        </button>
      </div>
      {(ratesError || commercialRatesError) && <p role="alert" className="text-xs text-destructive">Não foi possível consultar todas as comissões.</p>}
      {isLoading && <p>Carregando pessoas…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          Não foi possível carregar os cadastros. A atualização do banco de dados pode estar
          pendente.
        </p>
      )}
      {loadingRepresentatives && <p>Carregando representantes…</p>}
      {representativesError && (
        <p role="alert" className="text-destructive">
          Não foi possível carregar os representantes comerciais.
        </p>
      )}
      <ul aria-label="Equipe e representantes" className="space-y-2">
        {visibleEntries.map((entry) => (
          <li key={`${entry.kind}-${entry.id}`}>
            {entry.kind === "person" ? (
              <PersonRow
                person={entry.record}
                people={people}
                monthlySales={monthlySalesFor(entry.id)}
                linkedCommercial={linkedCommercialFor(entry.record)}
                selected={editing === `person:${entry.id}`}
                onSelect={() => setEditing(`person:${entry.id}`)}
                onClose={() => setEditing(null)}
                onSaved={refreshPeople}
              />
            ) : (
              <RepresentativeRow
                representative={entry.record}
                monthlySales="Sem vínculo com pedidos"
                selected={editing === `representative:${entry.id}`}
                onSelect={() => setEditing(`representative:${entry.id}`)}
                onClose={() => setEditing(null)}
                onSaved={refreshRepresentatives}
              />
            )}
          </li>
        ))}
      </ul>
      {!isLoading && !error && people.length === 0 && representatives.length === 0 && (
        <p className="rounded-xl bg-card p-4">Nenhuma pessoa cadastrada.</p>
      )}
      {visibleEntries.length === 0 && (people.length > 0 || representatives.length > 0) && (
        <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">
          Nenhuma pessoa encontrada.
        </p>
      )}
    </div>
  );
}

/** Linha compacta da lista: foto, nome, perfil, situação, comissão e contato. */
function PersonSummary({
  id, name, email, active, rate, role, phone, uf, region, commercialId, selected, onToggle, actions,
}: {
  id: string; name: string; email?: string | null; active: boolean; rate: string; role: string;
  phone?: string | null; uf?: string | null; region?: string | null;
  commercialId?: string | undefined; selected: boolean; onToggle: () => void; actions: ReactNode;
}) {
  const { data: areaDdds = "" } = useQuery({
    queryKey: ["representative-area-ddds-summary", id, commercialId],
    enabled: role.startsWith("Representante"),
    retry: false,
    queryFn: async () => {
      for (const representativeId of [id, commercialId].filter(Boolean) as string[]) {
        const { data, error } = await supabase
          .from("representative_area_ddds" as never)
          .select("ddds").eq("representative_id", representativeId).maybeSingle();
        if (error) throw error;
        const value = (data as { ddds?: string } | null)?.ddds?.trim();
        if (value) return value;
      }
      return "";
    },
  });
  const { data: commercialDetails } = useQuery({
    queryKey: ["commercial-representative-details", commercialId || id],
    enabled: role.startsWith("Representante"),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_representative_details" as never)
        .select("phone,state,region").eq("representative_id", commercialId || id).maybeSingle();
      if (error) throw error;
      return data as { phone?: string; state?: string; region?: string } | null;
    },
  });
  const { data: territory } = useQuery({
    queryKey: ["person-territory-summary", id],
    enabled: true,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_territories" as never)
        .select("region,city_base").eq("user_id", id).maybeSingle();
      if (error) throw error;
      return data as { region?: string | null; city_base?: string | null } | null;
    },
  });
  const { data: representativeRegion } = useQuery({
    queryKey: ["commercial-region-summary", commercialId || id],
    enabled: role.startsWith("Representante") && !uf,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_representative_details" as never)
        .select("region").eq("representative_id", commercialId || id).maybeSingle();
      if (error) return null;
      return data as { region?: string | null } | null;
    },
  });
  const { data: alternativePhone } = useQuery({
    queryKey: ["admin-person-whatsapp-fallback", id, name, email, commercialId],
    enabled: !phone?.trim(),
    retry: false,
    queryFn: async () => {
      const normalizedEmail = email?.trim().toLowerCase();
      if (commercialId) {
        const { data } = await supabase.from("commercial_representative_details" as never)
          .select("phone").eq("representative_id", commercialId).maybeSingle();
        const value = (data as { phone?: string } | null)?.phone?.trim();
        if (value) return value;
      }
      if (normalizedEmail) {
        const { data: profile } = await supabase.from("representative_profiles")
          .select("phone").eq("email", normalizedEmail).maybeSingle();
        if (profile?.phone?.trim()) return profile.phone.trim();
        const { data: commercial } = await supabase.from("commercial_representatives")
          .select("id,phone").eq("email", normalizedEmail).maybeSingle();
        if (commercial?.phone?.trim()) return commercial.phone.trim();
        if (commercial?.id) {
          const { data: details } = await supabase.from("commercial_representative_details" as never)
            .select("phone").eq("representative_id", commercial.id).maybeSingle();
          const value = (details as { phone?: string } | null)?.phone?.trim();
          if (value) return value;
        }
      }
      if (role.startsWith("Representante")) {
        const { data: namedCommercial } = await supabase.from("commercial_representatives")
          .select("id,phone").eq("full_name", name).maybeSingle();
        if (namedCommercial?.phone?.trim()) return namedCommercial.phone.trim();
        if (namedCommercial?.id) {
          const { data: details } = await supabase.from("commercial_representative_details" as never)
            .select("phone").eq("representative_id", namedCommercial.id).maybeSingle();
          const value = (details as { phone?: string } | null)?.phone?.trim();
          if (value) return value;
        }
      }
      return "";
    },
  });
  const displayPhone = phone?.trim() || alternativePhone || commercialDetails?.phone?.trim() || "";
  const digits = displayPhone.replace(/\D/g, "");
  const whatsappNumber = digits.length === 10 || digits.length === 11 ? "55" + digits : digits.length >= 12 && digits.startsWith("55") ? digits : "";
  const ddd = areaDdds || (digits.length >= 10 ? digits.slice(digits.startsWith("55") ? 2 : 0, digits.startsWith("55") ? 4 : 2) : "");
  const displayUf = uf?.trim() || commercialDetails?.state?.trim() || "—";
  const displayRegion = territory?.region?.trim() || region?.trim() || representativeRegion?.region?.trim() || commercialDetails?.region?.trim() || "—";
  const firstName = name.trim().split(/\s+/)[0] || "Sem nome";
  const [showClients, setShowClients] = useState(false);
  const isRepresentative = role.startsWith("Representante");
  const { data: assignedCustomers = [], isLoading: loadingClients, isError: clientsError } = useQuery({
    ...customersQuery,
    enabled: showClients && isRepresentative,
  });
  const ownerId = role.includes("cadastro comercial") ? null : id;
  const clientList = ownerId ? assignedCustomers.filter((customer) => customer.seller_id === ownerId) : [];

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <div className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"><PersonPhoto id={id} name={name} editable={selected} /></div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-black text-navy sm:text-base" title={name}>{firstName}</strong>
          <span className="block truncate text-[11px] font-semibold text-navy/75" title={role}>{role.replace(" (cadastro comercial)", "")}</span>
          {isRepresentative && <button type="button" onClick={() => setShowClients((open) => !open)} aria-expanded={showClients} className="mt-1 rounded-md border border-[#102a52]/30 px-2 py-0.5 text-[11px] font-bold text-[#102a52] hover:bg-[#102a52]/10">Clientes {showClients ? "−" : "+"}</button>}
        </div>
        {whatsappNumber ? (
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label={`Conversar com ${name} pelo WhatsApp`} title="Conversar pelo WhatsApp" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#128C4A]">
            <img src="/images/Logo_inicial_whatsapp.webp" alt="" width={30} height={30} className="h-8 w-8 object-contain" />
          </a>
        ) : <span title="WhatsApp não disponível" className="inline-flex h-8 w-8 shrink-0 items-center justify-center opacity-40"><img src="/images/Logo_inicial_whatsapp.webp" alt="" width={30} height={30} className="h-8 w-8 grayscale" /></span>}
        <span className="shrink-0 text-[11px] text-navy">DDD <strong className="font-black">{ddd || "—"}</strong></span>
        <span className="shrink-0 rounded-md bg-[#102a52]/10 px-1.5 py-1 text-[11px] font-extrabold text-[#102a52]">{rate}</span>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button type="button" onClick={onToggle} aria-expanded={selected} aria-label={`${selected ? "Fechar edição de" : "Editar"} ${name}`} title="Editar ficha completa" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#102a52]/25 text-[#102a52] hover:bg-[#102a52]/10"><Pencil size={17} aria-hidden="true" /></button>
          {actions}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-xs text-navy">
        <span><b>UF:</b> {displayUf}</span>
        <span><b>Região:</b> {displayRegion}</span>
      </div>
      {showClients && isRepresentative && (
        <div className="mt-2 rounded-xl border border-[#102a52]/15 bg-[#f1f1f1] p-3 text-xs text-navy">
          <strong>Clientes de {name} ({loadingClients ? "…" : clientList.length})</strong>
          {loadingClients ? <p className="mt-2">Carregando clientes…</p>
            : clientsError ? <p role="alert" className="mt-2 text-destructive">Não foi possível consultar a carteira.</p>
            : !clientList.length ? <p className="mt-2">Nenhum cliente vinculado a esta conta de acesso.</p>
            : <ul className="mt-2 space-y-1">{clientList.map((client) => (
                <li key={client.id} className="rounded-md bg-white px-2 py-1.5">{client.trade_name || client.company_name}</li>
              ))}</ul>}
        </div>
      )}
    </div>
  );
}

/** Card da lista que, quando selecionado, abre a ficha completa logo abaixo. */
function RowShell({ selected, children }: { selected: boolean; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [selected]);
  return (
    <article
      ref={ref}
      className={cn(
        "scroll-mt-3 rounded-2xl border bg-card p-2.5 shadow-sm transition-colors sm:p-3",
        selected ? "border-gold ring-2 ring-gold/30" : "border-border hover:border-gold/60",
      )}
    >
      {children}
    </article>
  );
}

function PersonRow({
  person,
  people,
  monthlySales,
  linkedCommercial,
  selected,
  onSelect,
  onClose,
  onSaved,
}: {
  person: Person;
  people: Person[];
  monthlySales: string;
  linkedCommercial?: CommercialRepresentative | undefined;
  selected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const ownAccount = me?.id === person.id;
  const [deleting, setDeleting] = useState(false);
  const { data: commissionData, isError: commissionError } = useQuery(
    personCommissionQuery(person.id),
  );
  const rate = commissionError
    ? "—"
    : commissionData == null
      ? person.site_role === "Administrador"
        ? "3,5%"
        : "Sem comissão"
      : formatRate(commissionData);
  async function remove() {
    if (ownAccount || deleting) return;
    const identity = person.full_name || person.email;
    if (
      !window.confirm(
        `Excluir DEFINITIVAMENTE ${identity}? A conta de login e o cadastro serão apagados. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-person", {
        body: { userId: person.id },
      });
      if (error) {
        let detail = error.message;
        if ("context" in error && error.context instanceof Response) {
          const response = error.context;
          try {
            const payload = await response.clone().json();
            detail = payload?.message || payload?.error || detail;
          } catch {
            detail = detail + " (HTTP " + response.status + ")";
          }
        }
        const network = /failed to send|failed to fetch|network|fetch failed/i.test(detail);
        toast.error(
          network
            ? "O serviço de exclusão não respondeu. Não foi possível confirmar a exclusão. Atualize PESSOAL antes de tentar novamente."
            : "Não foi possível excluir: " + detail,
          { duration: 9000 },
        );
        return;
      }
      if (!data || data.success !== true || data.deletedUserId !== person.id) {
        toast.error(
          "Exclusão não confirmada: " + (data?.message || "Resposta inesperada do servidor."),
          { duration: 9000 },
        );
        return;
      }
      qc.setQueryData<Person[]>(["admin-people"], (current) =>
        current?.filter((p) => p.id !== person.id),
      );
      // Hide linked commercial rows until their server-backed list is refreshed.
      qc.setQueryData<CommercialRepresentative[]>(["admin-commercial-representatives"], (current) =>
        current?.filter((p) => p.email.trim().toLowerCase() !== person.email.trim().toLowerCase()),
      );
      toast.success("Usuário excluído permanentemente.");
      onSaved();
      if (selected) onClose();
    } catch (cause) {
      toast.error(
        "Falha na comunicação com o serviço de exclusão. Nenhum cadastro foi confirmado como excluído.",
        { duration: 9000 },
      );
      console.error("delete-person:", cause);
    } finally {
      setDeleting(false);
    }
  }
  const deleteButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={deleting || ownAccount}
      onClick={() => void remove()}
      title={
        ownAccount
          ? "Não é permitido excluir a própria conta administrativa"
          : "Excluir usuário permanentemente"
      }
      aria-label={`Excluir definitivamente ${person.full_name || person.email}`}
      className="h-10 w-10 shrink-0 border-destructive/60 text-destructive disabled:opacity-40"
    >
      <Trash2 size={18} />
    </Button>
  );
  return (
    <RowShell selected={selected}>
      <PersonSummary
        id={person.id}
        name={person.full_name || "Sem nome"}
        email={person.email}
        active={person.access_active}
        rate={rate}
        role={person.site_role}
        phone={person.phone}
        uf={person.territory_uf}
        region={person.territory_cities}
        commercialId={linkedCommercial?.id}
        selected={selected}
        onToggle={selected ? onClose : onSelect}
        actions={deleteButton}
      />
      {selected && (
        <PersonEditor
          person={person}
          people={people}
          monthlySales={monthlySales}
          linkedCommercial={linkedCommercial}
          ownAccount={ownAccount}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </RowShell>
  );
}

/** Ficha da conta de acesso. Montada só quando aberta: Cancelar descarta o que não foi salvo. */
function PersonEditor({
  person,
  people,
  monthlySales,
  linkedCommercial,
  ownAccount,
  onClose,
  onSaved,
}: {
  person: Person;
  people: Person[];
  monthlySales: string;
  linkedCommercial?: CommercialRepresentative | undefined;
  ownAccount: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const sections = usePersonSections(`ficha-person-${person.id}`, ["dados", "acesso", "comissao", "carteira", "regiao"]);
  const [name, setName] = useState(person.full_name ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const { data: phoneSources } = useQuery({
    queryKey: ["representative-phone-sources", person.id, linkedCommercial?.id, person.email],
    enabled: person.site_role === "Representante",
    retry: false,
    queryFn: async () => {
      const [commercialResult, publicResult] = await Promise.all([
        linkedCommercial?.id
          ? supabase
              .from("commercial_representative_details" as never)
              .select("phone")
              .eq("representative_id", linkedCommercial.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("representative_profiles")
          .select("phone")
          .eq("email", person.email)
          .maybeSingle(),
      ]);
      if (commercialResult.error) throw commercialResult.error;
      if (publicResult.error) throw publicResult.error;
      return {
        commercial: (commercialResult.data as { phone?: string } | null)?.phone ?? "",
        public: (publicResult.data as { phone?: string } | null)?.phone ?? "",
      };
    },
  });
  const phoneInitialized = useRef(false);
  useEffect(() => {
    if (!phoneInitialized.current && phoneSources) {
      if (!person.phone?.trim()) setPhone(phoneSources.commercial || phoneSources.public || "");
      phoneInitialized.current = true;
    }
  }, [phoneSources, person.phone]);
  const [role, setRole] = useState<Role>(person.site_role);
  const [active, setActive] = useState(person.access_active);
  const [uf, setUf] = useState(person.territory_uf ?? "");
  const [cities, setCities] = useState(person.territory_cities ?? "");
  const [cityBase, setCityBase] = useState("");
  const [region, setRegion] = useState("");
  const [areaDdds, setAreaDdds] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [mapFile, setMapFile] = useState<File | null>(null);
  const territoryInitialized = useRef(false);
  const territoryEdited = useRef(false);
  const [supervisor, setSupervisor] = useState(person.supervisor_id ?? "");
  const [busy, setBusy] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const hasLinkedRecord = !!linkedCommercial;
  const linkedRecord = useRepresentativeRecord({
    name: linkedCommercial?.full_name ?? "",
    email: linkedCommercial?.email ?? "",
    representativeId: linkedCommercial?.id ?? "",
    commercial: true,
    omitPhone: true,
    enabled: hasLinkedRecord,
  });

  const sales = role === "Vendedor" || role === "Representante" || role === "Administrador";
  const { data: commissionData, isError: commissionError } = useQuery(
    personCommissionQuery(person.id),
  );
  const commissionInitialized = useRef(false);
  useEffect(() => {
    if (!commissionInitialized.current && commissionData !== undefined) {
      setCommissionRate(
        commissionData == null
          ? person.site_role === "Administrador"
            ? "3.5"
            : ""
          : String(commissionData),
      );
      commissionInitialized.current = true;
    }
  }, [commissionData, person.site_role]);
  const { data: territory } = useQuery({
    queryKey: ["person-territory", person.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_territories" as never)
        .select("city_base,region,map_url")
        .eq("user_id", person.id)
        .maybeSingle();
      if (error) throw error;
      return data as { city_base: string; region: string; map_url: string } | null;
    },
  });
  useEffect(() => {
    if (!territoryInitialized.current && !territoryEdited.current && territory !== undefined) {
      setCityBase(territory?.city_base ?? "");
      setRegion(territory?.region ?? "");
      setMapUrl(territory?.map_url ?? "");
      territoryInitialized.current = true;
    }
  }, [territory]);
  const { data: storedDdds } = useQuery({
    queryKey: ["representative-area-ddds", person.id],
    enabled: role === "Representante",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("representative_area_ddds" as never)
        .select("ddds")
        .eq("representative_id", person.id)
        .maybeSingle();
      if (error) throw error;
      return (data as { ddds?: string } | null)?.ddds ?? "";
    },
  });
  const dddsInitialized = useRef(false);
  useEffect(() => {
    if (!dddsInitialized.current && storedDdds !== undefined) {
      setAreaDdds(storedDdds);
      dddsInitialized.current = true;
    }
  }, [storedDdds]);

  async function save() {
    // Validações antes de qualquer gravação, abrindo o bloco onde está o problema.
    if (!name.trim()) {
      sections.reveal("dados");
      toast.error("Informe o nome da pessoa.");
      return;
    }
    if (sales && !territoryInitialized.current && !territoryEdited.current) {
      sections.reveal("regiao");
      toast.error("Aguarde o carregamento dos dados regionais antes de salvar.");
      return;
    }
    const parsedDdds = role === "Representante" ? parseAreaDdds(areaDdds) : [];
    if (!parsedDdds) {
      sections.reveal("regiao");
      toast.error("Informe DDDs de dois dígitos, separados por vírgula.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc(
      "admin_set_person" as never,
      {
        p_user: person.id,
        p_role: role,
        p_active: active,
        p_uf: uf,
        p_cities: cities,
        p_supervisor: supervisor || null,
      } as never,
    );
    if (error) {
      setBusy(false);
      toast.error("Não foi possível salvar permissões: " + error.message);
      return;
    }
    const { error: profileError } = await supabase.rpc(
      "admin_update_person_contact" as never,
      { p_user: person.id, p_name: name.trim(), p_phone: phone.trim() } as never,
    );
    if (profileError) {
      setBusy(false);
      toast.error(
        "Permissões salvas, mas nome/telefone não foram confirmados: " +
          (profileError?.message ??
            "O banco não autorizou a alteração. Verifique as permissões da tabela profiles."),
      );
      onSaved();
      return;
    }
    let contactWarning = "";
    if (role === "Representante" && linkedCommercial?.id) {
      const { error: commercialPhoneError } = await supabase
        .from("commercial_representative_details" as never)
        .upsert({ representative_id: linkedCommercial.id, phone: phone.trim() } as never, {
          onConflict: "representative_id",
        });
      const { error: publicPhoneError } = await supabase
        .from("representative_profiles")
        .update({ phone: phone.trim() })
        .eq("email", person.email);
      if (commercialPhoneError || publicPhoneError)
        contactWarning =
          " O WhatsApp foi salvo no perfil de acesso, mas não foi possível sincronizar todas as fichas públicas/comerciais.";
      void qc.invalidateQueries({ queryKey: ["representative-phone-sources", person.id] });
      void qc.invalidateQueries({ queryKey: ["representative-public-contact"] });
      void qc.invalidateQueries({
        queryKey: ["commercial-representative-details", linkedCommercial.id],
      });
    }
    let image = mapUrl.trim();
    if (mapFile) {
      const extension = mapFile.name.split(".").pop()?.toLowerCase() || "webp";
      const path = person.id + "/mapa-" + Date.now() + "." + extension;
      const uploaded = await supabase.storage
        .from("territory-maps")
        .upload(path, mapFile, { contentType: mapFile.type });
      if (uploaded.error) {
        setBusy(false);
        toast.error("Erro ao enviar mapa: " + uploaded.error.message);
        return;
      }
      image = supabase.storage.from("territory-maps").getPublicUrl(path).data.publicUrl;
    }
    const { data: savedTerritory, error: territoryError } = await supabase
      .from("person_territories" as never)
      .upsert(
        {
          user_id: person.id,
          city_base: cityBase.trim(),
          region: region.trim(),
          map_url: image,
        } as never,
        { onConflict: "user_id" },
      )
      .select("user_id")
      .maybeSingle();
    if (territoryError || !savedTerritory) {
      setBusy(false);
      toast.error(
        "Dados da pessoa salvos, mas região/mapa não foram confirmados: " +
          (territoryError?.message ?? "O banco não confirmou a gravação."),
      );
      onSaved();
      return;
    }
    if (role === "Representante") {
      const { error: dddError } = await supabase
        .from("representative_area_ddds" as never)
        .upsert({ representative_id: person.id, ddds: parsedDdds.join(", ") } as never, {
          onConflict: "representative_id",
        });
      if (dddError) {
        setBusy(false);
        toast.error(
          "DDD não foi salvo. Aplique a migração representative_area_ddds no Supabase: " +
            dddError.message,
        );
        return;
      }
      void qc.invalidateQueries({ queryKey: ["representative-area-ddds", person.id] });
      void qc.invalidateQueries({ queryKey: ["representative-area-ddds-summary", person.id] });
    }
    setMapUrl(image);
    setMapFile(null);
    territoryEdited.current = false;
    await qc.invalidateQueries({ queryKey: ["person-territory", person.id] });
    // Comissões são independentes: falhas não impedem o salvamento do território.
    const parsed =
      role === "Administrador" ? 3.5 : commissionRate === "" ? null : Number(commissionRate);
    const originalRate = commissionData ?? null;
    const commissionChanged =
      sales && commissionData !== undefined && !commissionError && parsed !== originalRate;
    let commissionWarning = "";
    if (commissionChanged) {
      if (
        parsed !== null &&
        (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 3.5 || !Number.isInteger(parsed * 2))
      ) {
        commissionWarning = "A comissão informada é inválida (permitido: 0,5% a 3,5%).";
      } else {
        const { error: rateError } = await supabase.rpc(
          "admin_set_salesperson_commission" as never,
          { p_user: person.id, p_rate: parsed } as never,
        );
        if (rateError) commissionWarning = "A comissão não foi atualizada: " + rateError.message;
        else void qc.invalidateQueries({ queryKey: ["person-commission", person.id] });
      }
    }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-people"] }),
      qc.invalidateQueries({ queryKey: ["person-territory-summary", person.id] }),
      qc.invalidateQueries({ queryKey: ["person-territory", person.id] }),
    ]);
    setBusy(false);
    if (commissionWarning || contactWarning)
      toast.warning("Pessoa e região salvas. " + commissionWarning + contactWarning);
    else toast.success("Pessoa e região atualizadas.");
    onSaved();
    onClose();
  }

  const regionSummary = sales
    ? [uf, cityBase].filter(Boolean).join(" · ") || "Não informada"
    : "Não se aplica a este perfil";
  const rateSummary =
    role === "Administrador"
      ? "3,5% (fixa para administrador)"
      : commissionRate
        ? formatRate(commissionRate)
        : "Não definida";
  return (
    <PersonEditorFrame
      title={`Ficha de ${person.full_name || person.email}`}
      saving={busy}
      saveLabel="Salvar ficha"
      onSave={() => void save()}
      onCancel={onClose}
      footerNote="Salvar grava dados, acesso, comissão e região. Transferências de clientes são gravadas na hora."
    >
      <PersonEditorSections
        state={sections}
        sections={{
          dados: {
            summary: phone || "Sem WhatsApp cadastrado",
            content: (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className={cn(labelClass, "md:col-span-2")}>
                    Nome completo
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    E-mail de acesso
                    <input
                      type="email"
                      value={person.email}
                      readOnly
                      className={cn(inputClass, "bg-muted text-muted-foreground")}
                    />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      Vinculado à conta de login.
                    </span>
                  </label>
                  <label className={labelClass}>
                    WhatsApp / Telefone
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                    />
                    {role === "Representante" && linkedCommercial && (
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        Ao salvar, também atualiza as fichas comercial e pública.
                      </span>
                    )}
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para trocar a foto, toque na foto da pessoa no topo da ficha.
                </p>
                {hasLinkedRecord && (
                  <RepresentativeRecordFields
                    record={linkedRecord}
                    group="personal"
                    title="Cadastro comercial vinculado — dados pessoais"
                  />
                )}
              </div>
            ),
          },
          acesso: {
            summary: `${role} · ${active ? "Ativo" : "Inativo"}`,
            content: (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className={labelClass}>
                    Perfil
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className={inputClass}
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Situação
                    <select
                      value={active ? "ativo" : "inativo"}
                      onChange={(e) => setActive(e.target.value === "ativo")}
                      className={inputClass}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </label>
                  {role === "Vendedor" && (
                    <label className={cn(labelClass, "md:col-span-2")}>
                      Representante responsável
                      <select
                        value={supervisor}
                        onChange={(e) => setSupervisor(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Não vinculado</option>
                        {people
                          .filter((p) => p.id !== person.id && p.site_role === "Representante")
                          .map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.full_name || p.email}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
                <p className="rounded-lg bg-secondary p-2.5 text-xs">
                  <strong>Permissões do perfil:</strong>{" "}
                  {role === "Visitante"
                    ? "Catálogo e preços à vista, sem pedidos."
                    : role === "Administrador"
                      ? "Administração, catálogo completo, preços, estoque e pedidos."
                      : role === "Representante"
                        ? "Catálogo completo, preços à vista e a prazo, estoque, pedidos e equipe."
                        : "Catálogo completo, preços à vista e a prazo, estoque e pedidos."}
                </p>
                {ownAccount && (
                  <p className="rounded-lg border border-gold/60 bg-gold-soft/40 p-2.5 text-xs">
                    Esta é a sua conta administrativa; ela não pode ser excluída por esta tela.
                  </p>
                )}
              </div>
            ),
          },
          comissao: {
            summary: rateSummary,
            content: (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClass}>
                    Percentual sobre vendas
                    <select
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      disabled={!sales || commissionError || role === "Administrador"}
                      className={cn(inputClass, "disabled:opacity-60")}
                    >
                      <option value="">Não definida</option>
                      {RATE_OPTIONS.map((rate) => (
                        <option key={rate} value={rate}>
                          {formatRate(rate)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!sales && (
                    <p className="text-xs text-muted-foreground">
                      Escolha Vendedor ou Representante em “Acesso e perfil” para habilitar a
                      comissão.
                    </p>
                  )}
                  {role === "Administrador" && (
                    <p className="text-xs text-muted-foreground">
                      Para o perfil Administrador a comissão é fixada em 3,5%.
                    </p>
                  )}
                  {commissionError && (
                    <p role="alert" className="text-xs font-bold text-destructive">
                      Não foi possível consultar a comissão. Não salve até corrigir a conexão.
                    </p>
                  )}
                  <p className="text-sm">
                    <strong>Vendas no mês:</strong> {monthlySales}
                  </p>
                  <p className="text-xs text-muted-foreground">Permitido: 0,5% a 3,5%.</p>
                </div>
                <SalesMiniChart sellerId={person.id} />
              </div>
            ),
          },
          carteira: {
            summary: "Atribuir e transferir clientes",
            content: (
              <CustomerPortfolio
                ownerId={person.id}
                ownerName={person.full_name || person.email}
                enabled={sections.open.includes("carteira")}
              />
            ),
          },
          regiao: {
            summary: regionSummary,
            content: (
              <div className="space-y-3">
                {!sales && (
                  <p className="rounded-lg bg-secondary p-2.5 text-sm">
                    A área de atuação fica disponível para Vendedor, Representante e Administrador.
                  </p>
                )}
                {sales && (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className={labelClass}>
                        Cidade-base
                        <input
                          value={cityBase}
                          onChange={(e) => {
                            territoryEdited.current = true;
                            setCityBase(e.target.value);
                          }}
                          placeholder="Ex.: Sorocaba"
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Estado(s) — UF
                        <input
                          value={uf}
                          onChange={(e) => setUf(e.target.value)}
                          placeholder="Ex.: SP, MG"
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Região de atuação
                        <input
                          value={region}
                          onChange={(e) => {
                            territoryEdited.current = true;
                            setRegion(e.target.value);
                          }}
                          placeholder="Ex.: Sorocaba e região"
                          className={inputClass}
                        />
                      </label>
                      {role === "Representante" && (
                        <label className={labelClass}>
                          DDD(s)
                          <input
                            value={areaDdds}
                            onChange={(e) => setAreaDdds(e.target.value)}
                            placeholder="Ex.: 11, 15, 19"
                            className={inputClass}
                          />
                          <span className="text-xs font-normal text-muted-foreground">
                            Separe por vírgula.
                          </span>
                        </label>
                      )}
                      <label className={cn(labelClass, "md:col-span-2")}>
                        Cidades atendidas
                        <textarea
                          value={cities}
                          onChange={(e) => setCities(e.target.value)}
                          rows={2}
                          placeholder="Ex.: Sorocaba, Itu, Votorantim"
                          className={cn(inputClass, "py-2")}
                        />
                      </label>
                    </div>
                    <details className="rounded-lg border border-border bg-background p-3">
                      <summary className="cursor-pointer text-sm font-bold">
                        Mapa da região {mapFile || mapUrl ? "(cadastrado)" : "(opcional)"}
                      </summary>
                      <div className="mt-3 space-y-2">
                        <label className={labelClass}>
                          Enviar imagem (PNG, JPG ou WebP, até 5 MB)
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (file && file.size > 5 * 1024 * 1024) {
                                toast.error("Limite de 5 MB.");
                                e.target.value = "";
                                return;
                              }
                              setMapFile(file);
                            }}
                            className="mt-1 block w-full text-sm font-normal"
                          />
                        </label>
                        <label className={labelClass}>
                          Ou endereço da imagem
                          <input
                            value={mapUrl}
                            onChange={(e) => {
                              setMapUrl(e.target.value);
                              setMapFile(null);
                            }}
                            placeholder="/images/territories/mapa.webp"
                            className={cn(inputClass, "text-sm")}
                          />
                        </label>
                        {mapFile ? (
                          <p className="text-xs">Imagem selecionada: {mapFile.name}</p>
                        ) : mapUrl ? (
                          <img
                            src={mapUrl}
                            alt="Mapa da região de atuação"
                            className="max-h-80 w-full rounded-xl object-contain"
                          />
                        ) : /\bGO\b/i.test(uf) ? (
                          <figure className="overflow-hidden rounded-xl border-2 border-gold bg-background p-1">
                            <img
                              src="/images/territories/mapa-goias.webp"
                              alt="Arte ilustrativa da área de atuação em Goiás, com Goiânia e municípios da região"
                              loading="lazy"
                              className="h-auto w-full object-contain"
                            />
                            <figcaption className="px-2 py-2 text-center text-xs text-muted-foreground">
                              Referência visual de Goiás. Confirme as cidades atendidas nos campos
                              acima.
                            </figcaption>
                          </figure>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem mapa personalizado.</p>
                        )}
                        {/abdenego|abdnego/i.test(person.full_name + " " + person.email) && (
                          <figure className="rounded-lg border border-border bg-background p-2">
                            <img
                              src="/images/territories/abdenego.webp"
                              alt="Mapa da área de atuação de Abdenego"
                              className="max-h-80 w-full object-contain"
                            />
                            <figcaption className="mt-1 text-center text-xs">
                              Mapa de atuação cadastrado
                            </figcaption>
                          </figure>
                        )}
                        {/livaldo/i.test(person.full_name + " " + person.email) && (
                          <figure className="rounded-lg border border-border bg-background p-2">
                            <img
                              src="/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png"
                              alt="Mapa da área de atuação de Livaldo"
                              className="max-h-80 w-full object-contain"
                            />
                            <figcaption className="mt-1 text-center text-xs">
                              Mapa de atuação cadastrado
                            </figcaption>
                          </figure>
                        )}
                      </div>
                    </details>
                  </>
                )}
                {hasLinkedRecord && (
                  <RepresentativeRecordFields
                    record={linkedRecord}
                    group="region"
                    title="Cadastro comercial vinculado — região"
                  />
                )}
              </div>
            ),
          },
        }}
      />
    </PersonEditorFrame>
  );
}

function RepresentativeRow({
  representative,
  monthlySales,
  selected,
  onSelect,
  onClose,
  onSaved,
}: {
  representative: CommercialRepresentative;
  monthlySales: string;
  selected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const { data: commercialCommission, error: commissionError } = useQuery(
    commercialCommissionQuery(representative.id),
  );
  async function remove() {
    if (
      !window.confirm(
        `Excluir DEFINITIVAMENTE o cadastro comercial de ${representative.full_name}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setDeleting(true);
    const { data, error } = await supabase
      .from("commercial_representatives")
      .delete()
      .eq("id", representative.id)
      .select("id");
    setDeleting(false);
    if (error) {
      toast.error("Não foi possível excluir: " + error.message);
      return;
    }
    if (!data?.length) {
      toast.error("O cadastro não foi excluído. Verifique as permissões do administrador.");
      return;
    }
    toast.success("Cadastro comercial excluído.");
    onSaved();
    if (selected) onClose();
  }
  const deleteButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={deleting}
      onClick={() => void remove()}
      title="Excluir cadastro comercial"
      aria-label={`Excluir cadastro comercial de ${representative.full_name}`}
      className="h-10 w-10 shrink-0 border-destructive/60 text-destructive disabled:opacity-40"
    >
      <Trash2 size={18} />
    </Button>
  );
  return (
    <RowShell selected={selected}>
      <PersonSummary
        id={representative.id}
        name={representative.full_name}
        email={representative.email}
        active={representative.active}
        rate={
          commissionError
            ? "—"
            : commercialCommission == null
              ? "Sem comissão"
              : formatRate(commercialCommission)
        }
        role="Representante (cadastro comercial)"
        selected={selected}
        onToggle={selected ? onClose : onSelect}
        actions={deleteButton}
      />
      {selected && (
        <RepresentativeEditor
          representative={representative}
          monthlySales={monthlySales}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </RowShell>
  );
}

/** Ficha de cadastro comercial ainda sem conta de acesso vinculada. */
function RepresentativeEditor({
  representative,
  monthlySales,
  onClose,
  onSaved,
}: {
  representative: CommercialRepresentative;
  monthlySales: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const sections = usePersonSections(`ficha-representative-${representative.id}`, ["dados", "acesso", "comissao", "carteira", "regiao"]);
  const record = useRepresentativeRecord({
    name: representative.full_name,
    email: representative.email,
    representativeId: representative.id,
    commercial: true,
    enabled: true,
  });
  const commercialMap = /abdenego|abdnego/i.test(representative.full_name)
    ? "/images/territories/abdenego.webp"
    : /livaldo/i.test(representative.full_name)
      ? "/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png"
      : null;
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(representative.full_name);
  const [email, setEmail] = useState(representative.email);
  const [active, setActive] = useState(representative.active);
  const [commissionRate, setCommissionRate] = useState("");
  const {
    data: commercialCommission,
    error: commissionError,
    isLoading: commissionLoading,
  } = useQuery(commercialCommissionQuery(representative.id));
  const commissionInitialized = useRef(false);
  useEffect(() => {
    if (!commissionInitialized.current && commercialCommission !== undefined) {
      setCommissionRate(commercialCommission == null ? "" : String(commercialCommission));
      commissionInitialized.current = true;
    }
  }, [commercialCommission]);
  async function save() {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      sections.reveal("dados");
      toast.error("Informe nome e e-mail válidos.");
      return;
    }
    setBusy(true);
    const { data: savedRepresentative, error } = await supabase
      .from("commercial_representatives")
      .update({ full_name: name.trim(), email: email.trim().toLowerCase(), active })
      .eq("id", representative.id)
      .select("id")
      .maybeSingle();
    if (error || !savedRepresentative) {
      setBusy(false);
      toast.error(
        "A ficha não foi atualizada: " + (error?.message ?? "O banco não autorizou a alteração."),
      );
      return;
    }
    // Sem a comissão atual carregada, não regravamos o percentual (evita apagá-lo por engano).
    if (!commissionInitialized.current) {
      setBusy(false);
      toast.warning(
        "Ficha atualizada. A comissão não foi alterada porque não pôde ser consultada.",
      );
      onSaved();
      onClose();
      return;
    }
    const rate = commissionRate === "" ? null : Number(commissionRate);
    const { error: rateError } = await supabase.rpc(
      "admin_set_commercial_representative_commission" as never,
      { p_representative: representative.id, p_rate: rate } as never,
    );
    setBusy(false);
    if (rateError) {
      toast.error("Ficha atualizada, mas comissão não salva: " + rateError.message);
      return;
    }
    await qc.invalidateQueries({
      queryKey: ["commercial-representative-commission", representative.id],
    });
    toast.success("Ficha e comissão atualizadas.");
    onSaved();
    onClose();
  }
  return (
    <PersonEditorFrame
      title={`Ficha de ${representative.full_name}`}
      saving={busy}
      saveLabel="Salvar ficha e comissão"
      onSave={() => void save()}
      onCancel={onClose}
      footerNote="Salvar grava nome, e-mail, situação e comissão. Dados cadastrais, região e DDDs têm botões próprios."
    >
      <PersonEditorSections
        state={sections}
        sections={{
          dados: {
            summary: record.values["phone"] || email,
            content: (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className={labelClass}>
                    Nome completo
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    E-mail
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
                <RepresentativeRecordFields
                  record={record}
                  group="personal"
                  title="Dados cadastrais"
                />
              </div>
            ),
          },
          acesso: {
            summary: `Cadastro comercial · ${active ? "Ativo" : "Inativo"}`,
            content: (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className={labelClass}>
                    Perfil
                    <select
                      value="Representante"
                      disabled
                      className={cn(inputClass, "bg-muted text-muted-foreground")}
                    >
                      <option>Representante</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Situação
                    <select
                      value={active ? "ativo" : "inativo"}
                      onChange={(e) => setActive(e.target.value === "ativo")}
                      className={inputClass}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cadastro comercial ainda sem conta de acesso; para mudar o perfil, vincule uma
                  conta. A exclusão não apaga contas de login nem outros registros.
                </p>
              </div>
            ),
          },
          comissao: {
            summary: commissionRate ? formatRate(commissionRate) : "Não definida",
            content: (
              <div className="space-y-2">
                <label className={labelClass}>
                  Percentual sobre vendas
                  <select
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    disabled={!!commissionError || commissionLoading}
                    className={cn(inputClass, "disabled:opacity-60")}
                  >
                    <option value="">Não definida</option>
                    {RATE_OPTIONS.map((rate) => (
                      <option key={rate} value={rate}>
                        {formatRate(rate)}
                      </option>
                    ))}
                  </select>
                </label>
                {commissionError && (
                  <p role="alert" className="text-xs font-bold text-destructive">
                    Não foi possível consultar a comissão: {commissionError.message}.
                  </p>
                )}
                <p className="text-sm">
                  <strong>Vendas no mês:</strong> {monthlySales}
                </p>
              </div>
            ),
          },
          carteira: {
            summary: representative.user_id
              ? "Atribuir e transferir clientes"
              : "Sem conta vinculada",
            content: representative.user_id ? (
              <CustomerPortfolio
                ownerId={representative.user_id}
                ownerName={representative.full_name}
                enabled={sections.open.includes("carteira")}
              />
            ) : (
              <p className="rounded-lg bg-secondary p-2.5 text-sm">
                Este cadastro ainda não tem conta de acesso vinculada, por isso não possui carteira.
                Clientes só podem ser atribuídos a representantes com conta ativa.
              </p>
            ),
          },
          regiao: {
            summary:
              [record.values["state"], record.values["city"]].filter(Boolean).join(" · ") ||
              "Ver área de atuação",
            content: (
              <div className="space-y-3">
                <RepresentativeRecordFields
                  record={record}
                  group="region"
                  title="Região de atuação"
                />
                <CommercialAreaDdds representativeId={representative.id} />
                {commercialMap && (
                  <a
                    href={commercialMap}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-border bg-background p-2"
                  >
                    <img
                      src={commercialMap}
                      alt={`Mapa de atuação de ${representative.full_name}`}
                      className="max-h-80 w-full object-contain"
                    />
                    <span className="mt-1 block text-center text-xs font-bold">
                      Ampliar mapa de atuação
                    </span>
                  </a>
                )}
              </div>
            ),
          },
        }}
      />
    </PersonEditorFrame>
  );
}
