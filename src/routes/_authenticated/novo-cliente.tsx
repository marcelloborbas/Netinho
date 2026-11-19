import { pageHead } from "@/lib/page-head";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { draftActions } from "@/lib/order-store";
import { accessQuery } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/novo-cliente")({
  staticData: { sitemap: false },
  head: () => pageHead("/novo-cliente", "Cadastrar cliente | Netinho Auto Parts", "Cadastre um cliente e selecione-o para iniciar um pedido na Netinho Auto Parts."),
  component: NovoCliente,
});

function NovoCliente() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: access, isLoading: accessLoading } = useQuery(accessQuery);
  const isAdmin = access?.level === 1;
  const { data: representatives = [], isLoading: repsLoading } = useQuery({
    queryKey: ["customer-assignment-representatives"],
    enabled: isAdmin,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("commercial_representatives")
        .select("user_id,full_name,email,active").not("user_id", "is", null).order("full_name");
      if (error) throw error;
      return (data ?? []).filter((r) => r.user_id !== null);
    },
  });
  const [busy, setBusy] = useState(false);
  const [sellerId, setSellerId] = useState("");
  const [form, setForm] = useState({ company_name: "", phone: "" });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as typeof form;
    if (Object.values(values).some((value) => !value)) {
      toast.error("Preencha o nome e o telefone do cliente.");
      return;
    }
    if (accessLoading || !access) {
      toast.error("Aguarde a confirmação do seu acesso e tente novamente.");
      return;
    }
    if (isAdmin && !representatives.some((r) => r.user_id === sellerId && r.active)) {
      toast.error("Selecione um representante ativo para este cliente.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("customers").insert({
        company_name: values.company_name,
        phone: values.phone,
        ...(isAdmin ? { seller_id: sellerId } : {}),
      }).select().single();
      if (error || !data) throw error ?? new Error("Não foi possível cadastrar.");
      draftActions.update({ customerId: data.id, customerName: data.company_name, buyer: "" });
      await qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente cadastrado e selecionado para o pedido.");
      void navigate({ to: "/pedido" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 px-3 pb-8">
      <header className="rounded-2xl border-2 border-[#d4af37] bg-[#08733e] px-4 py-5 text-center shadow-md">
        <h1 className="text-2xl font-extrabold tracking-wide text-white">CADASTRE SEU CLIENTE</h1>
      </header>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm">
        {isAdmin && (
          <div className="space-y-1.5">
            <Label htmlFor="representative" className="text-sm font-bold text-[#102a52]">Representante responsável *</Label>
            <select id="representative" required value={sellerId} disabled={repsLoading || busy}
              onChange={(event) => setSellerId(event.target.value)}
              className="h-12 w-full rounded-lg border bg-white px-3 text-base">
              <option value="">{repsLoading ? "Carregando..." : "Selecione o representante"}</option>
              {representatives.filter((r) => r.active).map((r) => (
                <option key={r.user_id} value={r.user_id!}>{r.full_name} · {r.email}</option>
              ))}
            </select>
          </div>
        )}
        {(["company_name", "phone"] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-sm font-bold text-[#102a52]">{key === "company_name" ? "Nome" : "Telefone"}</Label>
            <Input id={key} required maxLength={key === "phone" ? 30 : 200} type={key === "phone" ? "tel" : "text"}
              value={form[key]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))}
              className="h-12 bg-white text-base" />
          </div>
        ))}
        <p className="rounded-xl border border-[#b8cee8] bg-[#edf4ff] p-3 text-sm leading-6 text-[#102a52]">
          {isAdmin ? "O cliente ficará vinculado ao representante selecionado." : "O cliente ficará automaticamente vinculado à sua carteira. Somente você e o administrador poderão acessá-lo."}
        </p>
        <Button type="submit" disabled={busy || accessLoading || !access || (isAdmin && repsLoading)}
          className="h-12 w-full rounded-xl bg-[#1687d9] text-base font-bold text-white hover:bg-[#0c70bc]">
          {busy ? "Salvando..." : "Salvar cliente e voltar ao pedido"}
        </Button>
      </form>
    </main>
  );
}
