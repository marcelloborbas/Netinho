import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/downloads")({
  head: () => pageHead("/downloads", "Baixar documentos | Netinho Auto Parts", "Catálogo FCO, formulário de pedido e ficha cadastral."),
  component: DownloadsPage,
});

const documents = [
  { label: "Baixar Catálogo - FCO", filename: "Catalogo_Netinho Representação FCO.pdf" },
  { label: "Baixar Formulário de Pedido", filename: "Formulario_Pedido_Netinho.pdf" },
  { label: "Baixar Ficha Cadastral", filename: "Ficha_Cadastral_Representantes_ da_Netinho.pdf" },
] as const;

function DownloadsPage() {
  return <main className="mx-auto w-full max-w-2xl space-y-4 pb-24 text-[#102a52]">
    <header className="rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-5 py-6 text-center shadow-lg">
      <h1 className="text-2xl font-black tracking-wide text-white">BAIXAR DOCUMENTOS</h1>
    </header>
    {documents.map(doc => {
      const url = "/downloads/" + encodeURIComponent(doc.filename);
      return <section key={doc.filename} className="rounded-2xl border border-[#d4af37] bg-white p-4 shadow-md">
        <h2 className="flex items-center gap-3 text-base font-black sm:text-lg"><FileText size={26} className="shrink-0 text-[#0b4b92]"/>{doc.label}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={url} download={doc.filename} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#102a52] px-2 py-3 text-sm font-bold text-white"><Download size={19}/> Baixar</a>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#102a52] px-2 py-3 text-sm font-bold text-[#102a52]"><Eye size={19}/> Visualizar</a>
        </div>
      </section>;
    })}
  </main>;
}
