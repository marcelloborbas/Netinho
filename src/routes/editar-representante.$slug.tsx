import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BrandPageLayout } from "@/components/BrandPageLayout";

export const Route = createFileRoute("/editar-representante/$slug")({
  component: EditRepresentativePage,
  head: () => ({ meta: [
    { title: "Editar representante | Netinho Auto Parts" },
    { name: "description", content: "Administração do cadastro de representantes comerciais da Netinho Auto Parts." },
    { property: "og:title", content: "Editar representante | Netinho Auto Parts" },
    { property: "og:description", content: "Administração do cadastro de representantes comerciais da Netinho Auto Parts." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const profiles: Record<string, { name: string; region: string; back: "/representante" | "/representante-livaldo" }> = {
  "abdenego-eugenio": { name: "Abdenego Eugênio", region: "Vale do Paraíba e Litoral Norte", back: "/representante" },
  "livaldo-souza-silva": { name: "Livaldo Souza Silva", region: "Todo o Brasil · Teste", back: "/representante-livaldo" },
};

type PrivateDetails = { cpf: string | null; rg: string | null; street_address: string | null; neighborhood: string | null; postal_code: string | null; city: string | null; state: string | null; service_cities: string | null };
type Representative = { slug: string; full_name: string; region: string; email: string | null; phone: string | null };

function EditRepresentativePage() {
  const { slug } = Route.useParams();
  const profile = profiles[slug];
  const { data: me, isLoading: checkingAdmin } = useQuery(meQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState({ cpf: "", rg: "", street_address: "", neighborhood: "", postal_code: "", city: "", state: "", service_cities: "" });
  const setDetail = (key: keyof typeof details, value: string) => setDetails(prev => ({ ...prev, [key]: value }));
  const { data: privateRecord } = useQuery({ queryKey: ["representative-private", slug], enabled: !!profile && me?.isAdmin === true, queryFn: async () => { const { data, error } = await supabase.from("representative_private_details" as never).select("*").eq("slug", slug).maybeSingle(); if (error) throw error; return data as PrivateDetails | null; } });
  const { data: record, isLoading, error } = useQuery({
    queryKey: ["edit-commercial-representative", slug],
    enabled: !!profile && me?.isAdmin === true,
    queryFn: async () => {
      const response = await supabase.from("representative_profiles" as never).select("*").eq("slug", slug).maybeSingle();
      if (response.error) throw response.error;
      return response.data as Representative | null;
    },
  });

  useEffect(() => {
    setName(record?.full_name ?? profile?.name ?? "");
    setEmail(record?.email ?? "");
    setPhone(record?.phone ?? "");
    setRegion(record?.region ?? profile?.region ?? "");
  }, [record, profile?.name]);

  useEffect(() => { if (privateRecord) setDetails({ cpf: privateRecord.cpf ?? "", rg: privateRecord.rg ?? "", street_address: privateRecord.street_address ?? "", neighborhood: privateRecord.neighborhood ?? "", postal_code: privateRecord.postal_code ?? "", city: privateRecord.city ?? "", state: privateRecord.state ?? "", service_cities: privateRecord.service_cities ?? "" }); }, [privateRecord]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!me?.isAdmin) return;
    if (!name.trim() || !region.trim()) { toast.error("Preencha nome e região."); return; }
    setBusy(true);
    try {
      const result = await supabase.from("representative_profiles" as never)
        .upsert({ slug, full_name: name.trim(), region: region.trim(), email: email.trim().toLowerCase() || null, phone: phone.trim() || null } as never, { onConflict: "slug" });
      if (result.error) throw result.error;
      const { service_cities: _existingServiceCities, ...editableDetails } = details;
      const privateResult = await supabase.from("representative_private_details" as never).upsert({ slug, ...editableDetails } as never, { onConflict: "slug" });
      if (privateResult.error) throw privateResult.error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["edit-commercial-representative", slug] }),
        qc.invalidateQueries({ queryKey: ["representative-profile", slug] }),
        qc.invalidateQueries({ queryKey: ["representative-private", slug] }),
        qc.invalidateQueries({ queryKey: ["representative-service-areas"] }),
      ]);
      toast.success("Dados do representante atualizados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar representante.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <BrandPageLayout><main className="mx-auto max-w-xl p-6">Representante não encontrado. <Link to="/auth" className="text-primary underline">Voltar</Link></main></BrandPageLayout>;
  if (checkingAdmin) return <BrandPageLayout><main className="mx-auto max-w-xl p-6">Verificando permissão...</main></BrandPageLayout>;
  if (!me?.isAdmin) return <BrandPageLayout><main className="mx-auto max-w-xl space-y-3 p-6"><p className="flex items-center gap-2"><LockKeyhole size={18} /> Acesso exclusivo do administrador.</p><Link to="/auth" className="text-primary underline">Voltar ao login</Link></main></BrandPageLayout>;

  return (
    <BrandPageLayout><main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link to="/admin-gestao" hash="representantes" className="inline-flex items-center gap-2 font-bold text-[#173b67]"><ArrowLeft size={18} /> Voltar à gestão</Link>
      <section className="surface-card space-y-5 p-5">
        <div><h1 className="text-2xl font-bold">Editar representante comercial</h1><p className="mt-1 text-sm text-muted-foreground">Somente administradores podem alterar este cadastro.</p></div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-display text-2xl font-bold text-amber-400">{profile.name}</p>
          <p className="text-sm text-muted-foreground">Acesso Google autorizado no painel Administração.</p>
        </div>
        <p className="text-sm text-muted-foreground">Área de atuação: {record?.region ?? profile.region}</p>
        {isLoading ? <p>Carregando cadastro...</p> : error ? <p className="text-destructive">Não foi possível carregar o cadastro no banco de dados.</p> : (
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="rep-name">Nome completo</Label><Input id="rep-name" required value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-region">Região de atuação (resumo)</Label><Input id="rep-region" required value={region} onChange={e => setRegion(e.target.value)} /><p className="text-xs text-slate-700">Descrição resumida da região. O mapa e as localidades existentes são mantidos.</p></div>
            <div className="space-y-2"><Label htmlFor="rep-email">E-mail (opcional)</Label><Input id="rep-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-phone">Telefone</Label><Input id="rep-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <h2 className="text-lg font-bold">Dados cadastrais (somente administrador)</h2>
            {([["cpf","CPF"],["rg","RG"],["street_address","Endereço (rua e número)"],["neighborhood","Bairro"],["postal_code","CEP"],["city","Cidade"],["state","Estado (UF)"],] as const).map(([key,label]) => <div key={key} className="space-y-2"><Label htmlFor={`rep-${key}`}>{label}</Label><Input id={`rep-${key}`} value={details[key]} onChange={e => setDetail(key,e.target.value)} /></div>)}
            <div className="rounded-xl border border-[#274766] bg-[#102a52] p-4 text-white">
              <p className="font-bold">Localidades e mapa já cadastrados</p>
              <p className="mt-1 text-sm text-white">As cidades e o mapa de atuação permanecem no cadastro original. Não é necessário informá-los novamente nesta ficha.</p>
              <Link to={profile.back} className="mt-3 inline-flex rounded-lg border border-amber-400 px-3 py-2 text-sm font-bold text-white">Consultar mapa e localidades</Link>
            </div>
            <p className="text-xs text-muted-foreground">CPF, RG e endereço são dados privados e não aparecem na página pública. A autorização comercial é gerenciada separadamente.</p>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Salvando..." : "Salvar alterações"}</Button>
          </form>
        )}
      </section>
    </main></BrandPageLayout>
  );
}
