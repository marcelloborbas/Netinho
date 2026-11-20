import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cadastro-digital")({
  component: CadastroDigital,
  ssr: false,
  staticData: { sitemap: true },
});

type Tipo = "cliente" | "vendedor" | "representante";
const campos = {
  "Informações básicas": [
    ["razao_social", "Nome completo"], ["comercial_email", "E-mail"], ["comercial_telefone", "Telefone"],
    ["documento", "CNPJ / CPF"], ["identidade", "Inscrição estadual / RG"],
    ["cep", "CEP"], ["endereco", "Endereço"], ["numero", "Número"], ["complemento", "Complemento"],
    ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"],
    ["transportador", "Transportador"], ["ramo", "Ramo de atividade"],
  ],
  "Contato comercial": [["comercial_nome", "Nome do contato"]],
  "Contato financeiro": [["financeiro_nome", "Nome do contato"], ["financeiro_email", "E-mail"], ["financeiro_telefone", "Telefone / celular"]],
  "Nota fiscal eletrônica (NFe)": [["nfe_nome", "Nome do contato"], ["nfe_email", "E-mail"], ["nfe_telefone", "Telefone / celular"]],
  "Referências bancárias": [["referencia", "Referência bancária (empresa e contato)"], ["banco", "Banco"], ["agencia", "Agência"], ["conta", "Conta corrente"], ["favorecido", "Favorecido / CPF"], ["pix", "Chave PIX"]],
  "Em que região pretende atender": [["regiao", "Região pretendida"], ["cidades_atendidas", "Cidades que pretende atender"], ["experiencia", "Experiência comercial"]],
} as const;

function CadastroDigital() {
  const { data: access } = useQuery(accessQuery);
  const isVisitor = access?.attribution === "Visitante" || access?.level === 3;
  const numeroRef = useRef<HTMLInputElement>(null);
  const cepRequest = useRef(0);
  const [cepErro, setCepErro] = useState("");
  const [consultandoCep, setConsultandoCep] = useState(false);
  const consultarCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    const request = ++cepRequest.current;
    if (digits.length !== 8) { setCepErro(""); setConsultandoCep(false); return; }
    setConsultandoCep(true);
    setCepErro("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error("Consulta indisponível");
      const endereco = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (request !== cepRequest.current) return;
      if (endereco.erro) { setCepErro("CEP não encontrado. Preencha o endereço manualmente."); return; }
      setDados(old => ({ ...old, endereco: endereco.logradouro || old.endereco || "", bairro: endereco.bairro || old.bairro || "", cidade: endereco.localidade || old.cidade || "", uf: endereco.uf || old.uf || "" }));
      window.requestAnimationFrame(() => numeroRef.current?.focus());
    } catch {
      if (request === cepRequest.current) setCepErro("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      if (request === cepRequest.current) setConsultandoCep(false);
    }
  };
  const [tipo, setTipo] = useState<Tipo>("cliente");
  const [dados, setDados] = useState<Record<string, string>>({});
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [erroEnvio, setErroEnvio] = useState("");
  const sections = Object.entries(campos)
    .filter(([titulo]) => tipo === "cliente" ? titulo !== "Em que região pretende atender" : !["Contato financeiro","Nota fiscal eletrônica (NFe)","Referências bancárias"].includes(titulo))
    .filter(([titulo]) => !isVisitor || !["Contato comercial", "Contato financeiro", "Nota fiscal eletrônica (NFe)", "Referências bancárias"].includes(titulo))
    .map(([titulo, fields]) => [titulo, isVisitor && titulo === "Informações básicas"
      ? fields.filter(([key]) => !["transportador", "ramo"].includes(key))
      : fields] as const);
  const set = (key: string, value: string) => { setDados(old => ({ ...old, [key]: value })); setProtocolo(""); };
  const valido = () => !!(dados["razao_social"]?.trim() && dados["documento"]?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados["comercial_email"] || "") && consentimento);
  const enviar = async () => {
    setErroEnvio("");
    if (!valido()) { setErroEnvio("Preencha nome, documento, e-mail válido e aceite o aviso de privacidade."); return; }
    setEnviando(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { setErroEnvio("Entre na sua conta, inclusive como visitante, antes de enviar a ficha."); return; }
      const { data, error } = await supabase.from("registration_requests" as never).insert({user_id: auth.user.id, applicant_type: tipo, form_data: dados, status: "recebido"} as never).select("id").single();
      if (error) throw error;
      setProtocolo(String((data as {id:string}).id));
    } catch { setErroEnvio("Não foi possível registrar o cadastro. Tente novamente."); }
    finally { setEnviando(false); }
  };
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-lg md:p-9">
      <Link to="/" className="text-sm text-blue-900 underline">Voltar ao início</Link>
      <header className="my-6 border-b border-amber-500 pb-4">
        <p className="text-sm font-bold tracking-widest text-amber-700">NETINHO AUTO PARTS</p>
        <h1 className="text-3xl font-bold text-blue-950">Faça parte da Netinho</h1>
        <p className="mt-2 text-slate-600">Preencha e envie a ficha digital diretamente para análise da Netinho Auto Parts.</p>
      </header>
      <label className="block font-semibold" htmlFor="tipo">Quero me cadastrar como</label>
      <select id="tipo" value={tipo} onChange={e => { setTipo(e.target.value as Tipo); setProtocolo(""); }} className="mt-2 w-full rounded-lg border p-3">
        <option value="cliente">Cliente</option><option value="vendedor">Vendedor</option><option value="representante">Representante</option>
      </select>
      {sections.map(([titulo, fields]) => <fieldset key={titulo} className="mt-7 rounded-xl border border-slate-200 p-4">
        <legend className="px-2 font-bold text-blue-950">{titulo}</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(([key, label]) => <label key={key} className={`block text-sm font-medium ${["razao_social", "comercial_email", "comercial_telefone"].includes(key) ? "md:col-span-2" : ""}`}>
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
      <button type="button" disabled={enviando || !!protocolo} onClick={() => void enviar()} className="mt-5 w-full rounded-xl bg-amber-600 p-4 font-bold text-white disabled:opacity-60">{enviando ? "Enviando..." : protocolo ? "Solicitação registrada" : "Enviar cadastro para análise"}</button>
      {erroEnvio && <p role="alert" className="mt-2 text-red-700">{erroEnvio}</p>}
      {protocolo && <p role="status" className="mt-3 break-all text-sm text-green-800">Cadastro recebido para análise. Protocolo: {protocolo}. Nenhuma permissão de vendas foi liberada automaticamente.</p>}

    </div>
  </main>;
}
