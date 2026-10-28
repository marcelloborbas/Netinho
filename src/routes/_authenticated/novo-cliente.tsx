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
  const [form, setForm] = useState({ company_name: "", trade_name: "", buyer: "", phone: "" });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as typeof form;
    if (Object.values(values).some((value) => !value)) {
      toast.error("Preencha as quatro informações básicas do cliente.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.from("customers").insert({
        company_name: values.company_name,
        trade_name: values.trade_name,
        buyer: values.buyer,
        phone: values.phone,
      }).select().single();
      if (error || !data) throw error ?? new Error("Não foi possível cadastrar.");
      draftActions.update({
        customerId: data.id,
        customerName: data.trade_name || data.company_name,
        buyer: data.buyer || "",
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
      <header className="rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-4 py-5 text-center shadow-md">
        <h1 className="text-2xl font-extrabold tracking-wide text-white">NOVO CLIENTE</h1>
      </header>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-[#b8cee8] bg-white p-4 shadow-sm">
        {([
          ["company_name", "1 - Razão Social"],
          ["trade_name", "2 - Nome Fantasia"],
          ["buyer", "3 - Nome do Comprador"],
          ["phone", "4 - Telefone"],
        ] as const).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-sm font-bold text-[#102a52]">{label}</Label>
            <Input id={key} required maxLength={key === "phone" ? 30 : 200} type={key === "phone" ? "tel" : "text"} value={form[key]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} className="h-12 bg-white text-base" />
          </div>
        ))}
        <p className="rounded-xl border border-[#b8cee8] bg-[#edf4ff] p-3 text-sm leading-6 text-[#102a52]">
          Estas são as informações básicas para efetuar a venda. Posteriormente, será necessário encaminhar os demais dados e documentos para completar o cadastro do cliente.
        </p>
        <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-[#1687d9] text-base font-bold text-white hover:bg-[#0c70bc]">
          {busy ? "Salvando..." : "Salvar cliente e voltar ao pedido"}
        </Button>
      </form>
    </main>
  );
}
