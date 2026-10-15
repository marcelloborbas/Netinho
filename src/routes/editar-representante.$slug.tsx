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

type Representative = { id: string; full_name: string; email: string; phone: string | null; active: boolean; user_id: string | null };

function EditRepresentativePage() {
  const { slug } = Route.useParams();
  const profile = profiles[slug];
  const { data: me, isLoading: checkingAdmin } = useQuery(meQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: record, isLoading, error } = useQuery({
    queryKey: ["edit-commercial-representative", slug],
    enabled: !!profile && me?.isAdmin === true,
    queryFn: async () => {
      const response = await supabase.from("commercial_representatives" as never).select("*").eq("full_name", profile.name).maybeSingle();
      if (response.error) throw response.error;
      return response.data as Representative | null;
    },
  });

  useEffect(() => {
    setName(record?.full_name ?? profile?.name ?? "");
    setEmail(record?.email ?? "");
    setPhone(record?.phone ?? "");
  }, [record, profile?.name]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!me?.isAdmin || !record) return;
    if (!name.trim() || !email.trim()) { toast.error("Preencha nome e e-mail."); return; }
    setBusy(true);
    try {
      const result = await supabase.from("commercial_representatives" as never)
        .update({ full_name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || null } as never)
        .eq("id", record.id);
      if (result.error) throw result.error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["edit-commercial-representative", slug] }),
        qc.invalidateQueries({ queryKey: ["commercial-representatives"] }),
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
        <p className="text-sm text-muted-foreground">Área de atuação: {profile.region}</p>
        {isLoading ? <p>Carregando cadastro...</p> : error ? <p className="text-destructive">Não foi possível carregar o cadastro no banco de dados.</p> : !record ? (
          <p className="rounded-lg border p-4 text-sm">Este representante ainda não possui um registro correspondente na tabela commercial_representatives. Cadastre-o primeiro na Administração para habilitar a edição dos dados.</p>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="rep-name">Nome completo</Label><Input id="rep-name" required value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-email">E-mail</Label><Input id="rep-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="rep-phone">Telefone</Label><Input id="rep-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Situação: {record.active ? "Ativo" : "Inativo"} · {record.user_id ? "Conta vinculada" : "Conta ainda não vinculada"}</p>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Salvando..." : "Salvar alterações"}</Button>
          </form>
        )}
      </section>
    </main>
  );
}
