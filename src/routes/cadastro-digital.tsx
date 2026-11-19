import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/cadastro-digital")({
  component: CadastroDigital,
  ssr: false,
});

type Tipo = "cliente" | "vendedor" | "representante";
const campos = {
  "Informações básicas": [
    ["nome_fantasia", "Nome fantasia"], ["razao_social", "Razão social / Nome completo"],
    ["documento", "CNPJ / CPF"], ["identidade", "Inscrição estadual / RG"],
    ["endereco", "Endereço"], ["cidade", "Cidade"], ["uf", "UF"], ["cep", "CEP"],
    ["transportador", "Transportador"], ["ramo", "Ramo de atividade"],
  ],
  "Contato comercial": [["comercial_nome", "Nome do contato"], ["comercial_email", "E-mail"], ["comercial_telefone", "Telefone / celular"]],
  "Contato financeiro": [["financeiro_nome", "Nome do contato"], ["financeiro_email", "E-mail"], ["financeiro_telefone", "Telefone / celular"]],
  "Nota fiscal eletrônica (NFe)": [["nfe_nome", "Nome do contato"], ["nfe_email", "E-mail"], ["nfe_telefone", "Telefone / celular"]],
  "Referências bancárias": [["referencia", "Referência bancária (empresa e contato)"], ["banco", "Banco"], ["agencia", "Agência"], ["conta", "Conta corrente"], ["favorecido", "Favorecido / CPF"], ["pix", "Chave PIX"]],
  "Atuação profissional": [["regiao", "Região de atuação"], ["cidades_atendidas", "Cidades atendidas"], ["experiencia", "Experiência comercial"]],
} as const;

function CadastroDigital() {
  const [tipo, setTipo] = useState<Tipo>("cliente");
  const [dados, setDados] = useState<Record<string, string>>({});
  const [consentimento, setConsentimento] = useState(false);
  const [gerado, setGerado] = useState(false);
  const sections = Object.entries(campos).filter(([titulo]) => tipo !== "cliente" || titulo !== "Atuação profissional");
  const set = (key: string, value: string) => { setDados(old => ({ ...old, [key]: value })); setGerado(false); };
  const pdf = () => {
    if (!dados.razao_social?.trim() || !dados.documento?.trim() || !dados.comercial_email?.trim() || !consentimento) {
      window.alert("Preencha nome, CPF/CNPJ, e-mail comercial e confirme o aviso de privacidade.");
      return;
    }
    const doc = new jsPDF();
    let y = 20;
    const line = (text: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const parts = doc.splitTextToSize(text, 174);
      if (y + parts.length * 6 > 275) { doc.addPage(); y = 20; }
      doc.text(parts, 18, y); y += parts.length * 6 + 2;
    };
    doc.setFontSize(16); line("NETINHO AUTO PARTS", true);
    doc.setFontSize(12); line("FICHA CADASTRAL - " + tipo.toUpperCase(), true);
    line("Gerado em: " + new Date().toLocaleString("pt-BR"));
    sections.forEach(([titulo, fields]) => {
      y += 4; line(titulo.toUpperCase(), true);
      fields.forEach(([key, label]) => line(label + ": " + (dados[key] || "-")));
    });
    line("Declaração: o solicitante confirmou a ciência do tratamento dos dados para análise cadastral.");
    doc.save("ficha-cadastral-netinho-" + tipo + ".pdf");
    setGerado(true);
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-lg md:p-9">
      <Link to="/" className="text-sm text-blue-900 underline">Voltar ao início</Link>
      <header className="my-6 border-b border-amber-500 pb-4">
        <p className="text-sm font-bold tracking-widest text-amber-700">NETINHO AUTO PARTS</p>
        <h1 className="text-3xl font-bold text-blue-950">Faça parte da Netinho</h1>
        <p className="mt-2 text-slate-600">Preencha a ficha e gere seu PDF cadastral.</p>
      </header>
      <label className="block font-semibold" htmlFor="tipo">Quero me cadastrar como</label>
      <select id="tipo" value={tipo} onChange={e => { setTipo(e.target.value as Tipo); setGerado(false); }} className="mt-2 w-full rounded-lg border p-3">
        <option value="cliente">Cliente</option><option value="vendedor">Vendedor</option><option value="representante">Representante</option>
      </select>
      {sections.map(([titulo, fields]) => <fieldset key={titulo} className="mt-7 rounded-xl border border-slate-200 p-4">
        <legend className="px-2 font-bold text-blue-950">{titulo}</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(([key, label]) => <label key={key} className="block text-sm font-medium">
            {label}{["razao_social","documento","comercial_email"].includes(key) ? " *" : ""}
            <input value={dados[key] || ""} onChange={e => set(key, e.target.value)}
              type={key.includes("email") ? "email" : "text"} maxLength={250}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900" />
          </label>)}
        </div>
      </fieldset>)}
      <label className="mt-7 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consentimento} onChange={e => setConsentimento(e.target.checked)} className="mt-1" />
        Estou ciente de que os dados informados serão utilizados para análise do cadastro pela Netinho Auto Parts. Não há aprovação automática.
      </label>
      <button type="button" onClick={pdf} className="mt-5 w-full rounded-xl bg-blue-950 p-4 font-bold text-white">Gerar e baixar ficha em PDF</button>
      {gerado && <div className="mt-4 rounded-xl border p-4 text-sm">
        <p className="font-semibold">PDF gerado no seu dispositivo.</p>
        <p>Para encaminhar, anexe o arquivo baixado ao e-mail ou compartilhe-o pelo WhatsApp da Netinho. Esta versão ainda não realiza envio automático nem registra uma solicitação no banco de dados.</p>
      </div>}
    </div>
  </main>;
}
