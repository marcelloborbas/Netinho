import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ficha regional/cadastral de um representante comercial.
 *
 * Há duas origens já existentes no banco:
 *  - "profile": `representative_profiles` + `representative_private_details` (por slug);
 *  - "commercial": `commercial_representative_details` (por representative_id), usada
 *    quando não existe ficha pública.
 *
 * O estado fica neste hook para que os campos possam ser exibidos em abas
 * diferentes (Dados pessoais e Região) sem duas cópias divergentes do formulário.
 */
export type RecordGroup = "personal" | "region";
type FieldDef = { key: string; label: string; group: RecordGroup };

const PROFILE_FIELDS: FieldDef[] = [
  { key: "phone", label: "Telefone / WhatsApp", group: "personal" },
  { key: "street_address", label: "Endereço", group: "personal" },
  { key: "neighborhood", label: "Bairro", group: "personal" },
  { key: "postal_code", label: "CEP", group: "personal" },
  { key: "cpf", label: "CPF", group: "personal" },
  { key: "rg", label: "RG", group: "personal" },
  { key: "region", label: "Região de atuação", group: "region" },
  { key: "city", label: "Cidade-base", group: "region" },
  { key: "state", label: "Estado (UF)", group: "region" },
  { key: "service_cities", label: "Cidades atendidas", group: "region" },
];

const COMMERCIAL_FIELDS: FieldDef[] = [
  { key: "phone", label: "Telefone / WhatsApp", group: "personal" },
  { key: "street_address", label: "Endereço", group: "personal" },
  { key: "address_number", label: "Número", group: "personal" },
  { key: "neighborhood", label: "Bairro", group: "personal" },
  { key: "postal_code", label: "CEP", group: "personal" },
  { key: "cpf", label: "CPF", group: "personal" },
  { key: "rg", label: "RG", group: "personal" },
  { key: "city", label: "Cidade", group: "region" },
  { key: "state", label: "Estado (UF)", group: "region" },
  { key: "region", label: "Região de atuação", group: "region" },
  { key: "service_cities", label: "Cidades atendidas", group: "region" },
  { key: "map_url", label: "Endereço da imagem do mapa", group: "region" },
];

const PROFILE_DETAIL_KEYS = [
  "city",
  "state",
  "service_cities",
  "street_address",
  "neighborhood",
  "postal_code",
  "cpf",
  "rg",
] as const;

const norm = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Normaliza e valida DDDs ("011, 15;19" → ["11","15","19"]). Retorna null se houver DDD inválido. */
export function parseAreaDdds(input: string): string[] | null {
  const ddds = Array.from(
    new Set(
      input
        .split(/[,;\s]+/)
        .map((x) => x.replace(/^0+(?=\d)/, ""))
        .filter(Boolean),
    ),
  );
  return ddds.every((x) => /^\d{2}$/.test(x)) ? ddds : null;
}

export interface UseRepresentativeRecordOptions {
  name: string;
  email: string;
  representativeId: string;
  /** Quando true, usa a ficha comercial como alternativa se não houver ficha pública. */
  commercial?: boolean;
  /**
   * Oculta e não grava o telefone: na ficha de uma conta de acesso, o WhatsApp é
   * editado no campo principal e sincronizado com as fichas comercial e pública.
   */
  omitPhone?: boolean;
  /** Evita consultas enquanto a ficha estiver fechada ou sem cadastro vinculado. */
  enabled?: boolean;
}

export function useRepresentativeRecord({
  name,
  email,
  representativeId,
  commercial = false,
  omitPhone = false,
  enabled = true,
}: UseRepresentativeRecordOptions) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["admin-representative-detail", name, email],
    enabled,
    retry: false,
    queryFn: async () => {
      const { data: profiles, error: profileError } = await supabase
        .from("representative_profiles")
        .select("slug,full_name,email,phone,region");
      if (profileError) throw profileError;
      const profile =
        profiles?.find((p) => !!email && norm(p.email) === norm(email)) ??
        profiles?.find((p) => norm(p.full_name) === norm(name));
      if (!profile) return null;
      const { data: details, error: detailsError } = await supabase
        .from("representative_private_details")
        .select("city,state,service_cities,street_address,neighborhood,postal_code,cpf,rg")
        .eq("slug", profile.slug)
        .maybeSingle();
      if (detailsError) throw detailsError;
      return { profile, details };
    },
  });
  const record = profileQuery.data;
  const useCommercial = enabled && commercial && profileQuery.isSuccess && record === null;

  // Chave própria ("full"): o resumo do card usa a mesma raiz com colunas parciais.
  const commercialQuery = useQuery({
    queryKey: ["commercial-representative-details", representativeId, "full"],
    enabled: useCommercial,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_representative_details" as never)
        .select("*")
        .eq("representative_id", representativeId)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  const source: "profile" | "commercial" | null = record
    ? "profile"
    : useCommercial
      ? "commercial"
      : null;
  const allFields = source === "commercial" ? COMMERCIAL_FIELDS : PROFILE_FIELDS;
  const fields = allFields.filter((f) => !(omitPhone && f.key === "phone"));

  useEffect(() => {
    if (initialized) return;
    if (record) {
      setValues(
        Object.fromEntries(
          PROFILE_FIELDS.map((f) => {
            const from = f.key === "region" || f.key === "phone" ? record.profile : record.details;
            return [f.key, String((from as Record<string, unknown> | null)?.[f.key] ?? "")];
          }),
        ),
      );
      setInitialized(true);
    } else if (useCommercial && commercialQuery.isSuccess) {
      setValues(
        Object.fromEntries(
          COMMERCIAL_FIELDS.map((f) => [f.key, String(commercialQuery.data?.[f.key] ?? "")]),
        ),
      );
      setInitialized(true);
    }
  }, [initialized, record, useCommercial, commercialQuery.isSuccess, commercialQuery.data]);

  const setField = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    if (!initialized || saving) return;
    setSaving(true);
    try {
      if (source === "profile" && record) {
        const profileUpdate = omitPhone
          ? { region: values["region"] ?? "" }
          : { region: values["region"] ?? "", phone: values["phone"] ?? "" };
        const { error: profileError } = await supabase
          .from("representative_profiles")
          .update(profileUpdate)
          .eq("slug", record.profile.slug)
          .select("slug")
          .maybeSingle();
        if (profileError) throw profileError;
        const details = Object.fromEntries(
          PROFILE_DETAIL_KEYS.map((k) => [k, values[k] ?? ""]),
        ) as Record<(typeof PROFILE_DETAIL_KEYS)[number], string>;
        const { data: savedDetails, error: detailError } = await supabase
          .from("representative_private_details")
          .upsert({ slug: record.profile.slug, ...details }, { onConflict: "slug" })
          .select("slug")
          .maybeSingle();
        if (detailError) throw detailError;
        if (!savedDetails)
          throw new Error("O banco não confirmou a atualização dos dados cadastrais.");
        await qc.invalidateQueries({ queryKey: ["admin-representative-detail", name, email] });
      } else if (source === "commercial") {
        const keys = COMMERCIAL_FIELDS.map((f) => f.key).filter(
          (k) => !(omitPhone && k === "phone"),
        );
        const payload = {
          representative_id: representativeId,
          ...Object.fromEntries(keys.map((k) => [k, (values[k] ?? "").trim()])),
        };
        const { data: saved, error } = await supabase
          .from("commercial_representative_details" as never)
          .upsert(payload as never, { onConflict: "representative_id" })
          .select("representative_id")
          .maybeSingle();
        if (error) throw error;
        if (!saved) throw new Error("Nenhum registro atualizado.");
        await qc.invalidateQueries({
          queryKey: ["commercial-representative-details", representativeId],
        });
      } else {
        return;
      }
      toast.success("Dados da ficha comercial atualizados.");
    } catch (e) {
      toast.error(
        "Não foi possível salvar os dados da ficha: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setSaving(false);
    }
  }

  const loading =
    (enabled && profileQuery.isLoading) || (useCommercial && commercialQuery.isLoading);
  const error = profileQuery.error ?? (useCommercial ? commercialQuery.error : null);
  return { source, fields, values, setField, save, saving, initialized, loading, error };
}

export type RepresentativeRecordState = ReturnType<typeof useRepresentativeRecord>;

/** Campos de um grupo da ficha, com o botão que grava a ficha inteira. */
export function RepresentativeRecordFields({
  record,
  group,
  title,
}: {
  record: RepresentativeRecordState;
  group: RecordGroup;
  title: string;
}) {
  const groupFields = record.fields.filter((f) => f.group === group);
  return (
    <section className="space-y-3 rounded-xl border border-border bg-secondary/60 p-3 text-sm text-navy">
      <h4 className="font-extrabold">{title}</h4>
      {record.loading && <p>Carregando ficha…</p>}
      {record.error && (
        <p role="alert" className="text-destructive">
          Não foi possível consultar a ficha comercial: {record.error.message}
        </p>
      )}
      {!record.loading && !record.error && !record.source && (
        <p className="rounded-lg bg-gold-soft/40 p-3">
          Ficha comercial não encontrada. Não será criado cadastro duplicado.
        </p>
      )}
      {record.source && record.initialized && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groupFields.map((f) => (
              <label key={f.key} className="block font-bold">
                {f.label}
                <input
                  value={record.values[f.key] ?? ""}
                  onChange={(e) => record.setField(f.key, e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={record.saving}
            onClick={() => void record.save()}
            className="min-h-11 w-full rounded-lg bg-navy px-3 font-bold text-navy-foreground disabled:opacity-50"
          >
            {record.saving ? "Salvando dados…" : "Salvar dados da ficha comercial"}
          </button>
          <p className="text-xs text-muted-foreground">
            Este botão grava os dados pessoais e regionais da ficha comercial.
          </p>
        </>
      )}
    </section>
  );
}

/** DDDs de atuação gravados para o cadastro comercial (representative_area_ddds). */
export function CommercialAreaDdds({ representativeId }: { representativeId: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["commercial-representative-area-ddds", representativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("representative_area_ddds" as never)
        .select("ddds")
        .eq("representative_id", representativeId)
        .maybeSingle();
      if (error) throw error;
      return (data as { ddds?: string } | null)?.ddds ?? "";
    },
  });
  useEffect(() => {
    if (!loaded && data !== undefined) {
      setValue(data);
      setLoaded(true);
    }
  }, [loaded, data]);
  async function save() {
    if (isLoading || !loaded) {
      toast.error("Aguarde o carregamento dos DDDs.");
      return;
    }
    const ddds = parseAreaDdds(value);
    if (!ddds) {
      toast.error("Informe DDDs de dois dígitos, separados por vírgula.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase
      .from("representative_area_ddds" as never)
      .upsert({ representative_id: representativeId, ddds: ddds.join(", ") } as never, {
        onConflict: "representative_id",
      });
    setSaving(false);
    if (saveError) {
      toast.error("Não foi possível salvar os DDDs: " + saveError.message);
      return;
    }
    toast.success("DDDs de atuação salvos.");
    await qc.invalidateQueries({
      queryKey: ["commercial-representative-area-ddds", representativeId],
    });
    await qc.invalidateQueries({ queryKey: ["representative-area-ddds-summary"] });
  }
  return (
    <section className="space-y-2 rounded-xl border border-border bg-background p-3 text-sm text-navy">
      <label className="block font-bold">
        DDD(s) da área de atuação
        <input
          value={value}
          disabled={!loaded}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex.: 11, 15, 19"
          className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 font-normal"
        />
        <span className="text-xs font-normal text-muted-foreground">
          Separe múltiplos DDDs por vírgula.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-destructive">
          Não foi possível consultar os DDDs.
        </p>
      )}
      <button
        type="button"
        disabled={saving || !loaded}
        onClick={() => void save()}
        className="min-h-10 w-full rounded-lg border border-navy px-3 font-bold text-navy disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar DDDs"}
      </button>
    </section>
  );
}
