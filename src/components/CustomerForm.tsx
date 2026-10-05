import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Customer } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  company_name: z.string().trim().min(2, "Informe a razão social").max(200),
  email: z.string().trim().email("E-mail inválido").or(z.literal("")),
});

const FIELDS: { key: keyof Customer; label: string; full?: boolean; type?: string }[] = [
  { key: "company_name", label: "Razão social *", full: true },
  { key: "trade_name", label: "Nome fantasia", full: true },
  { key: "cnpj", label: "CNPJ" }, { key: "state_registration", label: "Inscrição estadual" },
  { key: "address", label: "Endereço", full: true },
  { key: "district", label: "Bairro" }, { key: "city", label: "Cidade" },
  { key: "state", label: "Estado (UF)" }, { key: "cep", label: "CEP" },
  { key: "phone", label: "Telefone", type: "tel" }, { key: "email", label: "E-mail", type: "email" },
  { key: "buyer", label: "Comprador" }, { key: "carrier", label: "Transportadora" },
  { key: "carrier_phone", label: "Fone transportadora", type: "tel" },
  { key: "notes", label: "Observações", full: true },
];

export function CustomerForm({ initial, onSaved }: { initial?: Customer | null; onSaved: (c: Customer) => void }) {
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, (initial?.[f.key] as string | null) ?? ""])));
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setBusy(true);
    const payload = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() || null])) as unknown as Partial<Customer> & { company_name: string };
    const q = initial
      ? supabase.from("customers").update(payload).eq("id", initial.id).select().single()
      : supabase.from("customers").insert(payload).select().single();
    const { data, error } = await q;
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar o cliente."); return; }
    toast.success("Cliente salvo");
    onSaved(data);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <div key={f.key} className={f.full ? "col-span-2 space-y-1" : "col-span-2 space-y-1 sm:col-span-1"}>
          <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
          <Input id={f.key} type={f.type ?? "text"} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className="h-11" />
        </div>
      ))}
      <Button type="submit" disabled={busy} className="col-span-2 h-12 bg-gradient-red font-semibold">
        {busy ? "Salvando..." : "Salvar cliente"}</Button>
    </form>
  );
}
