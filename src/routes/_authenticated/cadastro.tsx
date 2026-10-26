import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPinned, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/cadastro")({
  component: CadastroPage,
  head: () => ({ meta: [{ title: "Meu Cadastro | Netinho Auto Parts" }] }),
});

function CadastroPage() {
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  const { data: account, isLoading: loading, error } = useQuery({
    queryKey: ["my-registration"],
    retry: false,
    queryFn: async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Faça login para consultar seu cadastro.");
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("full_name,email,phone,site_role,access_active,territory_uf,territory_cities")
        .eq("id", auth.user.id).maybeSingle();
      if (profileError) throw profileError;
      const email = (profile?.email || auth.user.email || "").trim().toLowerCase();
      let regional: { region: string | null; phone: string | null; full_name: string | null } | null = null;
      let details: { city: string | null; state: string | null; service_cities: string | null; street_address: string | null; neighborhood: string | null; postal_code: string | null } | null = null;
      if (email) {
        const { data: rep } = await supabase.from("representative_profiles")
          .select("slug,full_name,email,phone,region").eq("email", email).maybeSingle();
        if (rep) {
          regional = { region: rep.region, phone: rep.phone, full_name: rep.full_name };
          const { data: detail } = await supabase.from("representative_private_details")
            .select("city,state,service_cities,street_address,neighborhood,postal_code")
            .eq("slug", rep.slug).maybeSingle();
          details = detail;
        }
      }
      return { profile, email, name: profile?.full_name || regional?.full_name || String(auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || auth.user.email || "Não informado"), regional, details };
    },
  });
  const role = access?.level === 1 ? "Administrador" : access?.attribution || account?.profile?.site_role || "Visitante";
  const name = account?.name || "";
  const map = /abdenego|abdnego/i.test(name) ? "/images/territories/abdenego.webp"
    : /livaldo/i.test(name) ? "/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png" : null;
  const line = (label: string, value: string | null | undefined) => <p className="border-b border-[#c8d6e6] py-2 text-sm"><strong>{label}:</strong> {value?.trim() || "Não informado"}</p>;
  return <div className="mx-auto max-w-3xl space-y-4 pb-8 text-[#102a52]">
    <header className="rounded-xl border-2 border-[#102a52] bg-[#f1f1f1] p-4 text-center">
      <h1 className="flex items-center justify-center gap-2 text-2xl font-black"><UserRound size={25} /> Meu Cadastro</h1>
    </header>
    <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-[#102a52] px-4 py-2 text-sm font-bold"><ArrowLeft size={18} /> Voltar ao início</Link>
    {loading && <p>Carregando seu cadastro...</p>}
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800">Não foi possível carregar seu cadastro. {error.message}</p>}
    {account && <>
      <section className="rounded-xl border-2 border-[#102a52] bg-[#f1f1f1] p-4">
        <h2 className="mb-3 text-lg font-extrabold">Dados do usuário</h2>
        {line("Nome", account.name)}
        {line("E-mail", account.email)}
        {line("Telefone", account.profile?.phone || account.regional?.phone)}
        {line("Status", role)}
        {line("Situação", account.profile ? (account.profile.access_active ? "Ativo" : "Inativo") : "Não informada")}
      </section>
      <section className="rounded-xl border-2 border-[#102a52] bg-[#f1f1f1] p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><MapPinned size={22} /> Locais de atendimento e mapa de atuação</h2>
        {line("Região de atuação", account.regional?.region)}
        {line("Estado (UF)", account.profile?.territory_uf || account.details?.state)}
        {line("Cidade-base", account.details?.city)}
        {line("Cidades atendidas", account.profile?.territory_cities || account.details?.service_cities)}
        {line("Endereço", [account.details?.street_address, account.details?.neighborhood, account.details?.postal_code].filter(Boolean).join(" · "))}
        {map ? <a href={map} target="_blank" rel="noreferrer" className="mt-4 block rounded-lg border border-[#102a52] bg-white p-2">
          <img src={map} alt={`Mapa de atuação de ${account.name}`} className="max-h-[440px] w-full object-contain" />
          <span className="block py-2 text-center text-sm font-bold">Ampliar mapa</span>
        </a> : <p className="mt-4 rounded-lg border border-[#c8d6e6] p-4 text-center text-sm">Não há imagem de mapa vinculada a este cadastro.</p>}
      </section>
    </>}
  </div>;
}
