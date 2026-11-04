import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/downloads")({
  head: () => ({ meta: [{ title: "Downloads | Netinho Auto Parts" }] }),
  component: DownloadsPage,
});

const fcoCatalog = "/downloads/Catalogo_Netinho%20Representa%C3%A7%C3%A3o%20FCO.pdf";

function DownloadsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 pb-24 text-[#102a52]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase">Downloads</h1>
        <Link to="/" className="inline-flex items-center gap-1 rounded-lg border border-[#d4af37] bg-white px-3 py-2 text-sm font-bold"><ArrowLeft size={17}/> Voltar</Link>
      </div>
      <section className="rounded-2xl border-2 border-[#d4af37] bg-white p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 shrink-0 text-[#0b4b92]" size={34}/>
          <div>
            <h2 className="text-xl font-black">Catálogo FCO Automotive</h2>
            <p className="mt-1 text-sm text-slate-600">Catálogo de peças automotivas em PDF (aproximadamente 16 MB).</p>
          </div>
        </div>
        <a href={fcoCatalog} download="Catalogo_Netinho_Representacao_FCO.pdf" className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#102a52] px-4 py-3 text-center text-base font-black text-white shadow-md hover:bg-[#164d8c]">
          <Download size={23}/> Baixar catálogo FCO
        </a>
        <p className="mt-3 text-center text-xs text-slate-600">No celular, baixar primeiro pode ser mais rápido que abrir o documento inteiro no navegador.</p>
        <a href={fcoCatalog} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-sm font-semibold text-[#0b4b92] underline">Visualizar PDF no navegador</a>
      </section>
    </main>
  );
}
