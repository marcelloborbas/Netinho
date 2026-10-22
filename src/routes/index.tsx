import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, MessageCircle, UserRound, BriefcaseBusiness, UserCog } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";

import { accessQuery } from "@/lib/access";
import { PromotionBanner } from "@/components/PromotionBanner";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [
    { title: "Início | Netinho Auto Parts" },
    { name: "description", content: "Acesse clientes, vendas, orçamentos, pedidos e campanhas Netinho Auto Parts." },
  ] }),
  component: Home,
});

function Home() {
  const { data: access } = useQuery({ ...accessQuery, retry: false, refetchInterval: 60000 });
  const previousLevel = useRef<string | null>(null);
  const navigate = useNavigate();
  const [requestedProfile, setRequestedProfile] = useState<string | null>(null);
  const [requestName, setRequestName] = useState("");
  const [requestPhone, setRequestPhone] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  useEffect(() => {
    if (!access) return;
    const current = `${access.level}:${access.can_sell}`;
    if (previousLevel.current !== null && previousLevel.current !== current && (access.can_sell || access.level === 1)) toast.success("Seu acesso foi atualizado! Confira os perfis disponíveis.");
    previousLevel.current = current;
  }, [access]);
  const userName = access?.name?.trim().split(/\s+/)[0];
  const isAdmin = access?.level === 1;
  const canSell = access?.can_sell === true || isAdmin;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const authorizedProfile = isAdmin
    ? { label: "Administrador", icon: UserCog, to: "/admin" as const }
    : canSell && access?.attribution === "Representante"
      ? { label: "Representante", icon: BriefcaseBusiness, to: "/representante" as const }
      : canSell
        ? { label: "Vendedor", icon: ShoppingCart, to: "/vendas" as const }
        : null;
  useEffect(() => {
    if (!authorizedProfile) return;
    // A autorização vem do banco (access_context), nunca do e-mail digitado.
    void navigate({ to: authorizedProfile.to, replace: true, search: authorizedProfile.to === "/vendas" ? { modo: "venda", q: "", promo: "" } : {} });
  }, [authorizedProfile?.to, navigate]);
  const requestUrlFor = (profile: string) => {
    const message = [
      "Solicitação de acesso - Netinho Auto Parts",
      `Perfil solicitado: ${profile}`,
      `Nome: ${requestName.trim() || access?.name || "Não informado"}`,
      `E-mail da conta: ${access?.email || "Não informado"}`,
      `Telefone: ${requestPhone.trim() || "Não informado"}`,
      `Informações adicionais: ${requestNotes.trim() || "Nenhuma"}`,
      "Aguardo avaliação e liberação pelo administrador.",
    ].join("\n");
    return `https://wa.me/5515992458492?text=${encodeURIComponent(message)}`;
  };
  return (
    <div className="home-page flex min-h-screen flex-col">
      <BrandHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <PromotionBanner />
        {authorizedProfile ? (
          <section className="mx-auto w-full max-w-md rounded-2xl border border-amber-400 bg-[#102a52] p-6 text-center text-white shadow-lg" aria-label="Seu perfil autorizado">
            <h2 className="mb-5 text-xl font-bold">{greeting}, {userName || "usuário"}!</h2>
            <authorizedProfile.icon className="mx-auto mb-3 h-16 w-16 text-amber-300" aria-hidden="true" />
            <p className="text-2xl font-black text-amber-300">{authorizedProfile.label}</p>
            <p className="mt-2 text-sm">Acesso autorizado. Abrindo seu painel...</p>
            <Link to={authorizedProfile.to} search={authorizedProfile.to === "/vendas" ? { modo: "venda", q: "", promo: "" } : {}} className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-3 font-bold text-white">Entrar no meu painel</Link>
          </section>
        ) : (
          <section className="rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm sm:p-6" aria-label="Selecionar perfil">
            <h2 className="mb-2 text-center text-xl font-extrabold text-[#102a52]">{greeting}, {userName || "usuário"}!</h2>
            <p className="mb-5 text-center text-sm text-slate-600">Seu acesso atual é Visitante. Solicite autorização para os demais perfis.</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {([
                { label: "Visitante", icon: UserRound, positive: "Acessa informações públicas e solicita atendimento.", negative: "Sem acesso a dados comerciais internos." },
                { label: "Vendedor", icon: ShoppingCart, positive: "Possui carteira de clientes e seus pedidos.", negative: "Acesso sujeito à autorização." },
                { label: "Representante", icon: BriefcaseBusiness, positive: "Acompanha vendedores vinculados à equipe.", negative: "Acesso sujeito à autorização." },
                { label: "Administrador", icon: UserCog, positive: "Gerencia e edita toda a operação.", negative: "Acesso sujeito à autorização." },
              ] as const).map(({ label, icon: Icon, positive, negative }) => (
                <div key={label} className="flex flex-col rounded-xl border border-[#b8cee8] bg-[#f8fbff] p-3 text-center shadow-sm">
                  {label === "Visitante" ? (
                    <Link to="/catalogo" className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-[#174e9b] bg-[#eaf2ff] p-3 font-extrabold text-[#102a52]"><Icon size={36}/>{label}</Link>
                  ) : (
                    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-slate-100 p-3 font-extrabold text-slate-500"><Icon size={36}/>{label}</div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-[#166534]">{positive}</p>
                  <p className="mt-2 text-xs font-semibold text-[#b91c1c]">{negative}</p>
                  {label !== "Visitante" && <button type="button" onClick={() => setRequestedProfile(label)} className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-[#17724d] bg-[#e8f6ed] px-2 py-2 text-xs font-bold text-[#14532d]"><MessageCircle size={16}/> Solicitar acesso</button>}
                </div>
              ))}
            </div>
            {requestedProfile && <form className="mx-auto mt-5 max-w-xl space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4" onSubmit={(event) => { event.preventDefault(); if (!requestName.trim() || !requestPhone.trim()) return; window.open(requestUrlFor(requestedProfile), "_blank", "noopener,noreferrer"); }}>
              <h3 className="font-extrabold text-[#102a52]">Solicitar acesso: {requestedProfile}</h3>
              <p className="text-xs text-slate-600">Preencha os dados. O botão abrirá uma mensagem para a administração no WhatsApp; confirme o envio por lá. A liberação depende do administrador.</p>
              <label className="block text-sm font-bold text-[#102a52]">Nome completo<input required value={requestName} onChange={e => setRequestName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
              <label className="block text-sm font-bold text-[#102a52]">Telefone / WhatsApp<input required type="tel" value={requestPhone} onChange={e => setRequestPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" /></label>
              <p className="text-xs text-slate-600">E-mail da conta: {access?.email || "Não informado"}</p>
              <label className="block text-sm font-bold text-[#102a52]">Observações (opcional)<textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900" rows={2} /></label>
              <div className="flex gap-2"><button type="submit" className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">Enviar solicitação</button><button type="button" onClick={() => setRequestedProfile(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700">Cancelar</button></div>
            </form>}
          </section>
        )}
      </main>
      <PublicFooter />   </div>
  );
}
