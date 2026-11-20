import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Download, Eye, List, Pencil, Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/downloads")({
  staticData: { sitemap: false },
  head: () => pageHead("/downloads", "Downloads | Netinho Auto Parts", "Catálogos, formulários e tabelas FCO."),
  component: DownloadsPage,
});

const documents = [
  { label: "Catálogo - FCO", filename: "Catalogo_Netinho Representação FCO.pdf" },
  { label: "Tabela de Valores – FCO", filename: "Tabela de Valores – FCO.pdf" },
] as const;

function DownloadsPage() {
  const { data: access } = useQuery(accessQuery);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [saving, setSaving] = useState(false);
  const isAdmin = access?.level === 1 || access?.attribution === "Administrador";
  const { data: updateDates = {} } = useQuery({
    queryKey: ["download-document-dates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("download_document_updates" as never).select("filename,updated_on");
      if (error) throw error;
      return Object.fromEntries(((data ?? []) as { filename: string; updated_on: string | null }[]).map(row => [row.filename, row.updated_on])) as Record<string, string | null>;
    },
  });
  const saveDate = async (filename: string) => {
    if (!isAdmin || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("download_document_updates" as never).upsert({ filename, updated_on: dateValue || null, modified_at: new Date().toISOString() } as never, { onConflict: "filename" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["download-document-dates"] });
      setEditing(null);
      toast.success("Data de atualização salva.");
    } catch {
      toast.error("Não foi possível salvar a data.");
    } finally {
      setSaving(false);
    }
  };
  const isVisitor = !access || (!access.can_sell && access.level !== 1 && access.attribution !== "Administrador" && access.attribution !== "Vendedor" && access.attribution !== "Representante");

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 rounded-[28px] bg-gradient-to-b from-[#e9f1fa] via-white to-[#f5f7fa] px-4 py-6 pb-28 text-[#102a52] sm:px-7">
      <header className="rounded-2xl bg-[#102a52] px-5 py-4 text-center shadow-lg">
        <h1 className="text-2xl font-black tracking-widest text-white sm:text-3xl">DOWNLOADS</h1>
      </header>
      {isVisitor && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
          Visitante: você pode visualizar os documentos PDF, mas os downloads estão disponíveis somente para usuários autorizados.
        </p>
      )}
      <div className="space-y-3">
        {documents.map((doc) => {
          const folder = "folder" in doc ? doc.folder + "/" : "";
          const url = "/downloads/" + folder + encodeURIComponent(doc.filename);
          const isPdf = doc.filename.toLowerCase().endsWith(".pdf");
          const storedDate = updateDates[doc.filename];
          const displayDate = storedDate ? storedDate.split("-").reverse().join("/") : "data não informada";
          return (
            <section key={doc.filename} className="rounded-2xl border border-[#c9d9ec] bg-white p-4 shadow-[0_5px_16px_rgba(16,42,82,.09)] transition-shadow hover:shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf2fc] text-[#102a52]"><List size={23} /></span>
                <h2 className="min-w-0 flex-1 text-base font-bold text-[#102a52]">{doc.label}</h2>
                {isPdf && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#102a52] px-3 py-2 text-sm font-bold text-[#102a52] transition-colors hover:bg-[#eaf2fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                    <Eye size={18} /> Visualizar
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe5f0] pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                  <CalendarDays size={16} />
                  {editing === doc.filename && isAdmin ? (
                    <>
                      <label htmlFor={`date-${doc.filename}`} className="sr-only">Data de atualização</label>
                      <input id={`date-${doc.filename}`} type="date" value={dateValue} onChange={event => setDateValue(event.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-[#102a52]" />
                      <button type="button" aria-label="Salvar data" disabled={saving} onClick={() => void saveDate(doc.filename)} className="rounded-md border border-green-600 p-2 text-green-700 disabled:opacity-50"><Check size={18} /></button>
                      <button type="button" aria-label="Cancelar edição" disabled={saving} onClick={() => setEditing(null)} className="rounded-md border border-slate-300 p-2"><X size={18} /></button>
                    </>
                  ) : (
                    <>
                      <span>Versão de atualização: {displayDate}</span>
                      {isAdmin && <button type="button" aria-label={`Editar data de ${doc.label}`} title="Editar data de atualização" onClick={() => { setEditing(doc.filename); setDateValue(storedDate ?? ""); }} className="rounded-md p-2 text-[#102a52] hover:bg-slate-100"><Pencil size={17} /></button>}
                    </>
                  )}
                </div>
                {isVisitor ? (
                  <span aria-disabled="true" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500"><Download size={18} /> Baixar</span>
                ) : (
                  <a href={url} download={doc.filename} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102a52] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#174b83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Download size={18} /> Baixar</a>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
