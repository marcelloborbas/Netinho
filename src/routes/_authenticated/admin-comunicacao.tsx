import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { MessageCircle, Send, Users, UserRound, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin-comunicacao")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Comunicação com Representantes | Netinho Auto Parts" }] }),
  component: AdminCommunication,
});

type Contact = { id: string; name: string; phone: string; source: "perfil" | "comercial" };
function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return null;
}
function AdminCommunication() {
  const { data: me, isLoading: checking } = useQuery(meQuery);
  const [message, setMessage] = useState("Olá! Aqui é da Netinho Auto Parts. Gostaria de compartilhar uma informação com você.");
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<"individual" | "todos">("individual");
  const [selected, setSelected] = useState<string[]>([]);
  const { data: contacts = [], isLoading, isError } = useQuery({
    queryKey: ["admin-whatsapp-representatives"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("id,full_name,phone,site_role").eq("site_role", "Representante").order("full_name");
      if (error) throw error;
      const items: Contact[] = (profiles ?? []).filter(p => !!p.phone).map(p => ({ id: p.id, name: p.full_name || "Representante", phone: p.phone!, source: "perfil" }));
      // Contatos comerciais sem conta de acesso também podem possuir telefone.
      const commercial = await supabase.from("commercial_representatives").select("id,full_name,phone,active").eq("active", true).order("full_name");
      if (!commercial.error) {
        for (const p of commercial.data ?? []) {
          if (p.phone && !items.some(item => whatsappNumber(item.phone) === whatsappNumber(p.phone!))) {
            items.push({ id: p.id, name: p.full_name || "Representante", phone: p.phone, source: "comercial" });
          }
        }
      }
      return items.filter(item => whatsappNumber(item.phone) !== null).sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
    },
  });
  const filtered = useMemo(() => contacts.filter(c => c.name.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR"))), [contacts, filter]);
  const recipients = mode === "todos" ? contacts : contacts.filter(c => selected.includes(c.source + ":" + c.id));
  const messageUrl = (phone: string) => `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(message.trim())}`;
  if (checking) return <p className="p-5">Verificando acesso…</p>;
  if (!me?.isAdmin) return <p className="p-5">Acesso restrito ao administrador.</p>;
  return <main className="mx-auto w-full max-w-4xl space-y-4 px-3 py-5 pb-28 text-[#102a52]">
    <AdminPageNavigation/>
    <header className="rounded-2xl border-2 border-[#d4af37] bg-gradient-to-br from-[#164b86] to-[#071b36] p-5 text-white">
      <h1 className="flex items-center gap-3 text-xl font-black sm:text-2xl"><MessageCircle className="text-[#f7d35a]"/> Comunicação com Representantes</h1>
      <p className="mt-2 text-sm text-white/85">Prepare comunicados e abra uma conversa individual no WhatsApp. Cada mensagem só é enviada após sua confirmação no aplicativo.</p>
    </header>
    <section className="space-y-3 rounded-2xl border border-[#d4af37]/60 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMode("individual")} aria-pressed={mode === "individual"} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 font-bold ${mode === "individual" ? "border-[#d4af37] bg-[#102a52] text-white" : "border-slate-200 bg-slate-50"}`}><UserRound size={18}/> Individual</button>
        <button type="button" onClick={() => setMode("todos")} aria-pressed={mode === "todos"} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 font-bold ${mode === "todos" ? "border-[#d4af37] bg-[#102a52] text-white" : "border-slate-200 bg-slate-50"}`}><Users size={18}/> Todos</button>
      </div>
      <label className="block text-sm font-bold">Mensagem
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={2000} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-base font-normal text-[#102a52]" placeholder="Escreva a mensagem para os representantes"/>
      </label>
      <p className="text-xs text-slate-600">Destinatários disponíveis: {contacts.length}. Números sem WhatsApp válido ou sem telefone cadastrado não aparecem.</p>
    </section>
    {mode === "individual" && <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-bold">Buscar representante<input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Nome do representante" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"/></label>
      {isLoading ? <p>Carregando representantes…</p> : isError ? <p role="alert">Não foi possível consultar os representantes.</p> : filtered.length === 0 ? <p className="text-sm">Nenhum representante com telefone encontrado. Confira os telefones em Pessoas e Comissões.</p> :
        <div className="max-h-80 space-y-1 overflow-y-auto">{filtered.map(c => <label key={c.source + c.id} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"><input type="checkbox" checked={selected.includes(c.source + ":" + c.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, c.source + ":" + c.id] : prev.filter(id => id !== c.source + ":" + c.id))} className="h-5 w-5 accent-[#123e74]"/><span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span><span className="text-xs text-slate-500">{c.phone}</span></label>)}</div>}
    </section>}
    {mode === "todos" && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">O WhatsApp comum não envia automaticamente uma mensagem para todos. Abra cada conversa abaixo e confirme o envio. Para disparos em massa, é necessária uma integração oficial com consentimento dos destinatários.</p>}
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-lg font-black"><Send size={20}/> Conversas preparadas ({recipients.length})</h2>
      {!message.trim() && <p role="alert" className="text-sm text-red-700">Escreva uma mensagem antes de abrir o WhatsApp.</p>}
      {recipients.length === 0 ? <p className="text-sm text-slate-600">Selecione representantes para começar.</p> : recipients.map(c => <a key={c.source + c.id} href={message.trim() ? messageUrl(c.phone) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!message.trim()} onClick={e => { if (!message.trim()) e.preventDefault(); }} className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#d4af37] px-4 font-semibold ${message.trim() ? "bg-[#e8f8ee] text-[#146c38]" : "pointer-events-none bg-slate-100 text-slate-400"}`}><span className="truncate">{c.name}</span><span className="flex shrink-0 items-center gap-2"><MessageCircle size={19}/> Abrir <ExternalLink size={15}/></span></a>)}
    </section>
    <Link to="/pessoas" className="inline-block text-sm font-bold underline">Gerenciar telefones em Pessoas e Comissões</Link>
  </main>;
}
