import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
export function CatalogDownload({
  brand,
  page,
  className = "supplier-download",
}: {
  brand: "FCO" | "HD";
  page?: number;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user || user.is_anonymous)
        throw new Error("Faça login para baixar o catálogo.");
      const filename = `${brand.toLowerCase()}-catalogo.pdf`;
      const { data, error } = await supabase.storage.from("catalogs").download(filename);
      if (error || !data) throw new Error("Não foi possível baixar o catálogo. Tente novamente.");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o catálogo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className={className} disabled={busy} onClick={download}>
      {busy ? "Baixando..." : page ? `Baixar catálogo · pág. ${page}` : `Baixar PDF ${brand}`}
    </button>
  );
}
