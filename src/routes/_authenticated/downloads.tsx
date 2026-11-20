import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Download, Eye, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
                <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><CalendarDays size={16} /> Versão de atualização: data não informada</span>
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
