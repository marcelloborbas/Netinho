import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText, ArrowLeft, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/downloads")({
  head: () => ({ meta: [{ title: "Baixar Docs | Netinho Auto Parts" }] }),
  component: DownloadsPage,
});

const fcoCatalog = "/downloads/Catalogo_Netinho%20Representa%C3%A7%C3%A3o%20FCO.pdf";


function AdditionalDocument({ title, filename }: { title: string; filename: string }) {
  const url = "/downloads/" + encodeURIComponent(filename);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(url, { method: "HEAD", cache: "no-store" })
      .then(response => { if (active) setReady(response.ok && (response.headers.get("content-type") ?? "").includes("pdf")); })
      .catch(() => { if (active) setReady(false); });
    return () => { active = false; };
  }, [url]);
  return <section className="rounded-2xl border-2 border-[#d4af37] bg-white p-5 shadow-lg">
    <div className="flex items-center gap-3"><FileText size={30} className="text-[#0b4b92]"/><h2 className="text-lg font-black">{title}</h2></div>
    {ready ? <div className="mt-4 grid grid-cols-2 gap-3">
      <a href={url} download={filename} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#102a52] px-2 py-3 font-bold text-white"><Download size={18}/> Baixar</a>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#102a52] px-2 py-3 font-bold"><Eye size={18}/> Visualizar</a>
    </div> : <p className="mt-3 text-sm text-slate-600">Aguardando publicação do arquivo PDF.</p>}
  </section>;
}

function DownloadsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 pb-24 text-[#102a52]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black uppercase">Baixar Docs</h1>
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
      <AdditionalDocument title="Formulário de Pedido / Orçamento" filename="Formulario_Pedido_Netinho.pdf" />
      <AdditionalDocument title="Ficha Cadastral de Representantes" filename="Ficha_Cadastral_Representantes_ da_Netinho.pdf" />
    </main>
  );
}
