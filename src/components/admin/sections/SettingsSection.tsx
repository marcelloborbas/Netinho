import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgePercent, Settings2, Tag, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const SETTINGS_KEY = ["admin-commercial-settings"] as const;

/** Valida o desconto máximo digitado (0 a 100, até duas casas). Retorna null se inválido. */
export function parseMaxDiscount(input: string): number | null {
  const value = Number(input.replace(",", ".").trim());
  if (input.trim() === "" || !Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100) / 100;
}

/** Regras comerciais configuráveis já existentes no banco. */
export function SettingsSection() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: SETTINGS_KEY,
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_settings")
        .select("max_discount_pct,updated_at")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settings) setValue(String(settings.max_discount_pct).replace(".", ","));
  }, [settings]);
  const current = settings ? Number(settings.max_discount_pct) : null;
  const parsed = parseMaxDiscount(value);
  const changed = parsed !== null && parsed !== current;

  async function save() {
    if (parsed === null) {
      toast.error("Informe um desconto entre 0% e 100%.");
      return;
    }
    if (
      !window.confirm(
        `Alterar o desconto máximo de vendedores e representantes para ${parsed.toLocaleString("pt-BR")}%? Vale para os próximos pedidos.`,
      )
    )
      return;
    setSaving(true);
    const { error: rpcError } = await supabase.rpc("admin_set_max_discount", { p_max: parsed });
    setSaving(false);
    if (rpcError) {
      toast.error("O desconto máximo não foi alterado: " + rpcError.message);
      return;
    }
    toast.success("Desconto máximo atualizado.");
    await qc.invalidateQueries({ queryKey: SETTINGS_KEY });
  }

  return (
    <div className="space-y-3 text-navy">
      <AdminSectionHeader
        icon={Settings2}
        title="Configurações"
        description="Regras comerciais e campanhas"
      />
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        aria-labelledby="desconto-maximo"
      >
        <h3 id="desconto-maximo" className="flex items-center gap-2 text-sm font-black">
          <BadgePercent size={18} className="text-gold-deep" aria-hidden="true" />
          Desconto máximo nos pedidos
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Limite para vendedores e representantes. Administradores não têm limite. O banco recusa
          pedidos acima deste valor.
        </p>
        {isLoading && <p className="mt-2 text-sm">Carregando…</p>}
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Não foi possível consultar a configuração: {error.message}
          </p>
        )}
        {settings && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block text-sm font-bold">
              Percentual (%)
              <input
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={parsed === null}
                className="mt-1 block min-h-11 w-32 rounded-lg border border-border bg-background px-3 font-normal"
              />
            </label>
            <Button
              type="button"
              disabled={!changed || saving}
              onClick={() => void save()}
              className="min-h-11 bg-navy text-navy-foreground hover:bg-navy-soft"
            >
              {saving ? "Salvando…" : "Salvar desconto"}
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              Atual: <strong>{current?.toLocaleString("pt-BR")}%</strong>
              {settings.updated_at
                ? ` · alterado em ${new Date(settings.updated_at).toLocaleDateString("pt-BR")}`
                : ""}
            </p>
          </div>
        )}
      </section>
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Outras configurações">
        <Link
          to="/catalogo"
          className="rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-gold"
        >
          <strong className="flex items-center gap-2 text-sm">
            <Tag size={17} className="text-gold-deep" aria-hidden="true" />
            Campanhas de produtos
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            No catálogo, cada peça tem a opção Normal, Oferta ou Saldão (visível só para o
            administrador).
          </span>
        </Link>
        <Link
          to="/transportadoras"
          className="rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-gold"
        >
          <strong className="flex items-center gap-2 text-sm">
            <Truck size={17} className="text-gold-deep" aria-hidden="true" />
            Modalidade de frete
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Frete FOB, informado aos vendedores.
          </span>
        </Link>
      </section>
    </div>
  );
}
