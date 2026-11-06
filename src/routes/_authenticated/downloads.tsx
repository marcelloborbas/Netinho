import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Eye, FolderOpen, ArrowDownToLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/downloads")({
  staticData: { sitemap: false },
  head: () => pageHead("/downloads", "Baixar documentos | Netinho Auto Parts", "Catálogo FCO, formulário de pedido e ficha cadastral."),
  component: DownloadsPage,
});

const documents = [
  { label: "Baixar Catálogo - FCO", filename: "Catalogo_Netinho Representação FCO.pdf" },
  { label: "Baixar Formulário de Pedido", filename: "Formulario_Pedido_Netinho.pdf" },
  { label: "Baixar Ficha Cadastral", filename: "Ficha_Cadastral_Representantes_ da_Netinho.pdf" },
] as const;

function DownloadsPage() {
  return <main className="mx-auto w-full max-w-2xl space-y-5 pb-24 text-[#102a52]">
    <header className="relative overflow-hidden rounded-[26px] border-2 border-[#d4af37] bg-gradient-to-br from-[#06172f] via-[#123e74] to-[#061a36] px-6 py-8 text-center shadow-[0_12px_30px_rgba(6,23,47,.3)]">
      <ArrowDownToLine size={34} className="mx-auto mb-3 text-[#ffe083]" aria-hidden="true"/><h1 className="text-2xl font-black tracking-wide text-[#ffe083] sm:text-3xl">BAIXAR DOCUMENTOS</h1><p className="mt-2 text-sm font-medium text-white/90">Catálogos, formulários e materiais de apoio para seu atendimento.</p>
    </header>
    <section className="rounded-[24px] border-2 border-[#d4af37] bg-gradient-to-b from-white to-[#f0f5fc] p-5 shadow-[0_8px_22px_rgba(16,42,82,.12)]">
      <h2 className="flex items-center gap-3 text-base font-black sm:text-lg"><FolderOpen size={26} className="shrink-0 text-[#0b4b92]"/>Material de Apoio - FCO</h2>
      <div className="mt-4 rounded-2xl border border-[#c9d9ec] bg-white p-4">
        <p className="break-words text-sm font-semibold">Apoio - FCO.zip</p>
        <p className="mt-1 text-xs text-slate-600">Todos os materiais de apoio FCO reunidos em um único arquivo compactado.</p>
        <a href="/downloads/material-de-apoio/Apoio%20-%20FCO.zip" download="Apoio - FCO.zip" className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37] bg-gradient-to-r from-[#0c2c57] to-[#15508a] px-3 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110"><Download size={18}/> Baixar Material de Apoio - FCO</a>
      </div>
    </section>
    {documents.map(doc => {
      const url = "/downloads/" + encodeURIComponent(doc.filename);
      return <section key={doc.filename} className="rounded-[22px] border border-[#d4af37] bg-white p-5 shadow-[0_7px_20px_rgba(16,42,82,.1)]">
        <h2 className="flex items-center gap-3 text-base font-black sm:text-lg"><FileText size={26} className="shrink-0 text-[#0b4b92]"/>{doc.label}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={url} download={doc.filename} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#164d88] to-[#0a284d] px-2 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110"><Download size={19}/> Baixar</a>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#102a52] px-2 py-3 text-sm font-bold text-[#102a52]"><Eye size={19}/> Visualizar</a>
        </div>
      </section>;
    })}
  </main>;
}
