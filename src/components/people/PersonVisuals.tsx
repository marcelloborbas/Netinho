import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Foto da pessoa; com `editable` permite enviar uma nova foto (redimensionada para WebP). */
export function PersonPhoto({
  id,
  name,
  editable = false,
}: {
  id: string;
  name: string;
  editable?: boolean;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const path = id + "/foto.webp";
  const url = supabase.storage.from("person-photos").getPublicUrl(path).data.publicUrl;
  useEffect(() => {
    let alive = true;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (alive && r.ok) setPhoto(url + "?v=" + Date.now());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  async function choose(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Escolha uma foto JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter até 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível processar a foto.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Falha ao preparar imagem."))),
          "image/webp",
          0.85,
        ),
      );
      const { error } = await supabase.storage
        .from("person-photos")
        .upload(path, blob, { upsert: true, contentType: "image/webp", cacheControl: "60" });
      if (error) throw error;
      setPhoto(url + "?v=" + Date.now());
      toast.success("Foto atualizada.");
    } catch (e) {
      toast.error(
        "Não foi possível salvar a foto: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setBusy(false);
    }
  }
  const image = photo ? (
    <img src={photo} alt={`Foto de ${name}`} className="h-full w-full object-cover" />
  ) : (
    <UserRound size={24} aria-hidden="true" />
  );
  const frame =
    "relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-gold bg-muted text-navy";
  if (!editable) return <div className={frame}>{image}</div>;
  return (
    <label title="Escolher foto" className={frame + " cursor-pointer"}>
      {image}
      <span className="absolute bottom-0 left-0 right-0 bg-navy/90 py-0.5 text-center text-[9px] font-bold text-navy-foreground">
        {busy ? "Enviando…" : "Foto +"}
      </span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        aria-label={`Selecionar foto de ${name}`}
        className="sr-only"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

/** Evolução das vendas (pedidos, sem orçamentos/cancelados) nos últimos quatro meses. */
export function SalesMiniChart({ sellerId }: { sellerId: string }) {
  const { data: series = [], isLoading } = useQuery({
    queryKey: ["admin-representative-sales-evolution", sellerId],
    enabled: !!sellerId,
    queryFn: async () => {
      const now = new Date();
      const local = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }).formatToParts(now);
      const year = Number(local.find((x) => x.type === "year")?.value);
      const month = Number(local.find((x) => x.type === "month")?.value);
      const months = Array.from({ length: 4 }, (_, i) => {
        const d = new Date(Date.UTC(year, month - 4 + i, 1));
        return {
          key: d.toISOString().slice(0, 7),
          label: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
            .format(d)
            .replace(".", ""),
          value: 0,
        };
      });
      const start = new Date(Date.UTC(year, month - 4, 1) - 86400000).toISOString();
      const end = new Date(Date.UTC(year, month, 1) + 86400000).toISOString();
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("orders")
          .select("seller_id,created_at,total,kind,status")
          .eq("seller_id", sellerId)
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at")
          .range(offset, offset + 499);
        if (error) throw error;
        for (const order of data ?? []) {
          if (order.kind === "orcamento" || order.status === "cancelled") continue;
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
          }).formatToParts(new Date(order.created_at));
          const key =
            parts.find((x) => x.type === "year")?.value +
            "-" +
            parts.find((x) => x.type === "month")?.value;
          const target = months.find((m) => m.key === key);
          if (target) target.value += Number(order.total ?? 0);
        }
        if ((data ?? []).length < 500) break;
      }
      return months;
    },
  });
  const max = Math.max(1, ...series.map((x) => x.value));
  const points = series.map((x, i) => `${8 + i * 48},${63 - (x.value / max) * 49}`).join(" ");
  const hasSales = series.some((x) => x.value > 0);
  return (
    <div
      className="flex h-[104px] min-w-0 flex-col justify-between rounded-lg bg-background p-2"
      aria-label="Evolução de Vendas nos últimos quatro meses"
    >
      <div className="text-xs font-extrabold text-navy">Evolução de vendas (4 meses)</div>
      {!sellerId ? (
        <span className="text-center text-[11px] text-muted-foreground">
          Sem vínculo com pedidos
        </span>
      ) : isLoading ? (
        <span className="text-center text-[11px] text-muted-foreground">Carregando…</span>
      ) : !hasSales ? (
        <span className="text-center text-[11px] text-muted-foreground">Sem vendas no período</span>
      ) : (
        <svg
          viewBox="0 0 160 72"
          className="h-[56px] w-full"
          role="img"
          aria-label="Gráfico de vendas por mês"
        >
          <path d="M8 63 H152" className="stroke-border" strokeWidth="1" />
          <polyline
            points={points}
            fill="none"
            className="stroke-gold-deep"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {series.map((x, i) => (
            <circle
              key={x.key}
              cx={8 + i * 48}
              cy={63 - (x.value / max) * 49}
              r="3"
              className="fill-gold-deep"
            >
              <title>
                {x.label}: {x.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </title>
            </circle>
          ))}
        </svg>
      )}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {series.map((x) => (
          <span key={x.key}>{x.label}</span>
        ))}
      </div>
    </div>
  );
}
