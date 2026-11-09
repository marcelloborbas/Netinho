import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Eye, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/downloads")({
  staticData: { sitemap: false },
  head: () => pageHead("/downloads", "Baixar documentos | Netinho Auto Parts", "Catálogo FCO, tabelas de valores, formulário de pedido e ficha cadastral."),
  component: DownloadsPage,
});

const documents = [
  { label: "Baixar Catálogo - FCO", filename: "Catalogo_Netinho Representação FCO.pdf" },
  { label: "Tabela de Valores - FCO | Produtos", filename: "Tabela_de_Valores_FCO_Produtos.pdf" },
  { label: "Tabela de Valores - FCO | Caixas e Bombas", filename: "Tabela_de_Valores_FCO_Caixas_e_Bombas.pdf" },
  { label: "Baixar Formulário de Pedido", filename: "Formulario_Pedido_Netinho.pdf" },
  { label: "Baixar Ficha Cadastral", filename: "Ficha_Cadastral_Representantes_ da_Netinho.pdf" },
] as const;

function DownloadsPage() {
  const { data: access } = useQuery(accessQuery);
  const isVisitor = !access || (!access.can_sell && access.level !== 1 && access.attribution !== "Administrador" && access.attribution !== "Vendedor" && access.attribution !== "Representante");
  return <main className="mx-auto w-full max-w-2xl space-y-5 pb-24 text-[#102a52]">
    <section className="rounded-[24px] border-2 border-[#d4af37] bg-gradient-to-b from-white to-[#f0f5fc] p-5 shadow-[0_8px_22px_rgba(16,42,82,.12)]">
      <h2 className="flex items-center gap-3 text-base font-black sm:text-lg"><FolderOpen size={26} className="shrink-0 text-[#0b4b92]"/>Material de Apoio - FCO</h2>
      {isVisitor && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">Visitante: você pode consultar os materiais, mas os downloads estão disponíveis somente para usuários autorizados.</p>}
      <div className="mt-4 rounded-2xl border border-[#c9d9ec] bg-white p-4">
        <p className="break-words text-sm font-semibold">Apoio - FCO.zip</p>
        <p className="mt-1 text-xs text-slate-600">Todos os materiais de apoio FCO reunidos em um único arquivo compactado.</p>
        {isVisitor ? <span aria-disabled="true" className="mt-4 inline-flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-3 py-3 text-sm font-black text-slate-500"><Download size={18}/> Download indisponível</span> : <a href="/downloads/material-de-apoio/Apoio%20-%20FCO.zip" download="Apoio - FCO.zip" className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37] bg-gradient-to-r from-[#0c2c57] to-[#15508a] px-3 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110"><Download size={18}/> Baixar Material de Apoio - FCO</a>}
      </div>
    </section>
    {documents.map(doc => {
      const url = "/downloads/" + encodeURIComponent(doc.filename);
      return <section key={doc.filename} className="rounded-[22px] border border-[#d4af37] bg-white p-5 shadow-[0_7px_20px_rgba(16,42,82,.1)]">
        <h2 className="flex items-center gap-3 text-base font-black sm:text-lg"><FileText size={26} className="shrink-0 text-[#0b4b92]"/>{doc.label}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {isVisitor ? <span aria-disabled="true" className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-2 py-3 text-sm font-black text-slate-500"><Download size={19}/> Baixar</span> : <a href={url} download={doc.filename} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#164d88] to-[#0a284d] px-2 py-3 text-sm font-black text-white shadow-md transition hover:brightness-110"><Download size={19}/> Baixar</a>}
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#102a52] px-2 py-3 text-sm font-bold text-[#102a52]"><Eye size={19}/> Visualizar</a>
        </div>
      </section>;
    })}
  </main>;
}
