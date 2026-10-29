import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { draftActions } from "@/lib/order-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/novo-cliente")({
  component: NovoCliente,
});

function NovoCliente() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ company_name: "", phone: "" });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as typeof form;
    if (Object.values(values).some((value) => !value)) {
      toast.error("Preencha o nome e o telefone do cliente.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("customers").insert({
        company_name: values.company_name,
        phone: values.phone,
      }).select().single();
      if (error || !data) throw error ?? new Error("Não foi possível cadastrar.");
      draftActions.update({
        customerId: data.id,
        customerName: data.company_name,
        buyer: "",
      });
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
        {([
          ["company_name", "Nome"],
          ["phone", "Telefone"],
        ] as const).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-sm font-bold text-[#102a52]">{label}</Label>
            <Input id={key} required maxLength={key === "phone" ? 30 : 200} type={key === "phone" ? "tel" : "text"} value={form[key]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} className="h-12 bg-white text-base" />
          </div>
        ))}
        <p className="rounded-xl border border-[#b8cee8] bg-[#edf4ff] p-3 text-sm leading-6 text-[#102a52]">
          Cadastre o nome e o telefone para iniciar o pedido. Os demais dados poderão ser completados posteriormente.
        </p>
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-[#1687d9] text-base font-bold text-white hover:bg-[#0c70bc]">
          {busy ? "Salvando..." : "Salvar cliente e voltar ao pedido"}
        </Button>
      </form>
    </main>
  );
}
