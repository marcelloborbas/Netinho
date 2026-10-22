import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { BrandHeader } from "@/components/BrandHeader";
import { accessQuery } from "@/lib/access";

const schema = z.object({ perfil: z.enum(["Vendedor", "Representante", "Administrador"]).catch("Vendedor") });
export const Route = createFileRoute("/solicitar-acesso")({
  validateSearch: schema,
  component: SolicitarAcesso,
});
function SolicitarAcesso() {
  const { perfil } = Route.useSearch();
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const message = [
      "Solicitação de acesso - Netinho Auto Parts",
      `Perfil solicitado: ${perfil}`,
      `Nome: ${name.trim()}`,
      `E-mail da conta Google: ${access?.email || "Não informado"}`,
      `Telefone: ${phone.trim()}`,
      `Observações: ${notes.trim() || "Nenhuma"}`,
      "Aguardo avaliação e liberação pelo administrador.",
    ].join("\n");
    window.location.href = `https://wa.me/5515992458492?text=${encodeURIComponent(message)}`;
  }
  return <div className="min-h-screen bg-[#f4f7fb]">
    <BrandHeader />
    <main className="mx-auto max-w-xl space-y-5 px-4 py-8 text-slate-900">
      <Link to="/" className="inline-flex min-h-11 items-center font-bold text-[#102a52]">← Voltar à página inicial</Link>
      <header className="rounded-2xl bg-[#102a52] p-6 text-white">
        <p className="text-sm font-bold text-[#facc15]">Netinho Auto Parts</p>
        <h1 className="mt-2 text-2xl font-extrabold">Solicitação de acesso</h1>
        <p className="mt-2 text-sm text-white">Você está solicitando autorização para utilizar recursos exclusivos do site.</p>
      </header>
      <form onSubmit={send} className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="rounded-lg border border-blue-200 bg-[#edf4ff] p-3">
          <p className="text-xs font-bold uppercase text-[#102a52]">Perfil solicitado</p>
          <p className="text-xl font-extrabold text-[#102a52]">{perfil}</p>
        </div>
        <label className="block text-sm font-bold text-[#102a52]">Nome completo
          <input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-900" placeholder="Seu nome completo" />
        </label>
        <label className="block text-sm font-bold text-[#102a52]">WhatsApp para contato
          <input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-900" placeholder="DDD + telefone" />
        </label>
        <p className="text-sm text-slate-700">Conta Google: <strong>{access?.email || "Não identificada"}</strong></p>
        <label className="block text-sm font-bold text-[#102a52]">Informações adicionais (opcional)
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-900" />
        </label>
        <p className="text-sm font-medium text-slate-700">Ao continuar, o WhatsApp será aberto com sua solicitação preenchida. <strong>Você deverá tocar em Enviar no WhatsApp.</strong> O acesso só será liberado após aprovação da administração.</p>
        <button type="submit" className="min-h-12 w-full rounded-xl bg-green-700 px-5 py-3 text-base font-extrabold text-white">Continuar para enviar pelo WhatsApp</button>
      </form>
    </main>
  </div>;
}
