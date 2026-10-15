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

export const Route = createFileRoute("/editar-representante/$slug")({
  component: EditRepresentativePage,
  head: () => ({ meta: [{ title: "Editar representante | Netinho Auto Parts" }] }),
});

const profiles: Record<string, { name: string; region: string; back: "/representante" | "/representante-livaldo" }> = {
  "abdenego-eugenio": { name: "Abdenego Eugênio", region: "Vale do Paraíba e Litoral Norte", back: "/representante" },
  "livaldo-souza-silva": { name: "Livaldo Souza Silva", region: "Todo o Brasil · Teste", back: "/representante-livaldo" },
};

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

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!me?.isAdmin) return;
    if (!name.trim() || !region.trim()) { toast.error("Preencha nome e região."); return; }
    setBusy(true);
    try {
      const result = await supabase.from("representative_profiles" as never)
        .upsert({ slug, full_name: name.trim(), region: region.trim(), email: email.trim().toLowerCase() || null, phone: phone.trim() || null } as never, { onConflict: "slug" });
      if (result.error) throw result.error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["edit-commercial-representative", slug] }),
        qc.invalidateQueries({ queryKey: ["representative-profile", slug] }),
      ]);
      toast.success("Dados do representante atualizados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar representante.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <main className="mx-auto max-w-xl p-6">Representante não encontrado. <Link to="/auth" className="text-primary underline">Voltar</Link></main>;
  if (checkingAdmin) return <main className="mx-auto max-w-xl p-6">Verificando permissão...</main>;
  if (!me?.isAdmin) return <main className="mx-auto max-w-xl space-y-3 p-6"><p className="flex items-center gap-2"><LockKeyhole size={18} /> Acesso exclusivo do administrador.</p><Link to="/auth" className="text-primary underline">Voltar ao login</Link></main>;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link to={profile.back} className="inline-flex items-center gap-2 text-primary"><ArrowLeft size={18} /> Voltar ao representante</Link>
      <section className="surface-card space-y-5 p-5">
        <div><h1 className="text-2xl font-bold">Editar representante comercial</h1><p className="mt-1 text-sm text-muted-foreground">Somente administradores podem alterar este cadastro.</p></div>
        <p className="font-display text-2xl font-bold text-amber-400">{profile.name}</p>
        <p className="text-sm text-muted-foreground">Área de atuação: {record?.region ?? profile.region}</p>
        {isLoading ? <p>Carregando cadastro...</p> : error ? <p className="text-destructive">Não foi possível carregar o cadastro no banco de dados.</p> : !record ? (
          <p className="rounded-lg border p-4 text-sm">O perfil ainda não foi importado. Você pode salvar os dados já preenchidos abaixo.</p>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="rep-name">Nome completo</Label><Input id="rep-name" required value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-region">Região de atuação</Label><Input id="rep-region" required value={region} onChange={e => setRegion(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-email">E-mail (opcional)</Label><Input id="rep-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-phone">Telefone</Label><Input id="rep-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Este formulário edita os dados públicos de apresentação. A autorização de acesso comercial é gerenciada separadamente.</p>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Salvando..." : "Salvar alterações"}</Button>
          </form>
        )}
      </section>
    </main>
  );
}
