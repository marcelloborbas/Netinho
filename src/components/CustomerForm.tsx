import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { customerAssignmentRepresentativesQuery, type Customer } from "@/lib/queries";
import { accessQuery } from "@/lib/access";
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
  { key: "cnpj", label: "CNPJ" },
  { key: "state_registration", label: "Inscrição estadual" },
  { key: "address", label: "Endereço", full: true },
  { key: "district", label: "Bairro" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado (UF)" },
  { key: "cep", label: "CEP" },
  { key: "phone", label: "Telefone", type: "tel" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "buyer", label: "Comprador" },
  { key: "carrier", label: "Transportadora" },
  { key: "carrier_phone", label: "Fone transportadora", type: "tel" },
  { key: "notes", label: "Observações", full: true },
];

export function CustomerForm({ initial, onSaved }: { initial?: Customer | null; onSaved: (c: Customer) => void }) {
  const { data: access, isLoading: accessLoading } = useQuery(accessQuery);
  const isAdmin = access?.level === 1;
  const { data: representatives = [], isLoading: repsLoading } = useQuery({ ...customerAssignmentRepresentativesQuery, enabled: isAdmin });
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, (initial?.[f.key] as string | null) ?? ""])),
  );
  const [orderClass, setOrderClass] = useState(initial?.order_class?.toString() ?? "");
  const [sellerId, setSellerId] = useState(initial?.seller_id ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (accessLoading || !access) {
      toast.error("Aguarde a confirmação do seu acesso e tente novamente.");
      return;
    }
    if (isAdmin && !sellerId) {
      toast.error("Selecione o representante responsável por este cliente.");
      return;
    }
    if (isAdmin && !representatives.some((r) => r.user_id === sellerId && r.active)) {
      toast.error("O cliente precisa ser atribuído a um representante ativo e vinculado a uma conta.");
      return;
    }
    setBusy(true);
    const payload = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() || null])) as unknown as Partial<Customer> & { company_name: string };
    payload.order_class = orderClass ? Number(orderClass) : null;
    // Representantes não escolhem o responsável: o banco atribui auth.uid().
    if (isAdmin) payload.seller_id = sellerId;
    const q = initial
      ? supabase.from("customers").update(payload).eq("id", initial.id).select().single()
      : supabase.from("customers").insert(payload).select().single();
    const { data, error } = await q;
    setBusy(false);
    if (error) {
      toast.error(error.code === "42501" ? "Sem permissão para alterar a carteira deste cliente." : "Não foi possível salvar o cliente.");
      return;
    }
    toast.success("Cliente salvo");
    onSaved(data);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      {isAdmin && (
        <div className="col-span-2 space-y-1">
          <Label htmlFor="customer-representative" className="text-xs font-bold">Representante responsável *</Label>
          <select id="customer-representative" required disabled={repsLoading || busy}
            className="h-11 w-full rounded-lg border bg-white px-3 text-sm" value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}>
            <option value="">{repsLoading ? "Carregando representantes..." : "Selecione o representante"}</option>
            {initial?.seller_id && !representatives.some((r) => r.user_id === initial.seller_id) && (
              <option value={initial.seller_id}>Responsável atual (inativo ou sem vínculo)</option>
            )}
            {representatives.map((r) => (
              <option key={r.user_id} value={r.user_id}>{r.full_name} · {r.email}{r.active ? "" : " (inativo)"}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Cada cliente fica vinculado a apenas um representante. O administrador pode transferir essa responsabilidade.</p>
        </div>
      )}
      {!isAdmin && <p className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">Este cliente ficará automaticamente vinculado à sua carteira e somente você e o administrador poderão acessá-lo.</p>}
      {FIELDS.map((f) => (
        <div key={f.key} className={f.full ? "col-span-2 space-y-1" : "col-span-2 space-y-1 sm:col-span-1"}>
          <Label htmlFor={f.key} className="text-xs">{f.label}</Label>
          <Input id={f.key} type={f.type ?? "text"} value={v[f.key]}
            onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className="h-11" />
        </div>
      ))}
      <label className="col-span-2 space-y-1 text-sm">
        Classe de pedido mínimo
        <select className="h-11 w-full rounded-lg border bg-secondary px-3" value={orderClass}
          onChange={(e) => setOrderClass(e.target.value)}>
          <option value="">Sem classe definida</option>
          <option value="1">Classe 1 · R$ 5.000,00</option>
          <option value="2">Classe 2 · R$ 10.000,00</option>
          <option value="3">Classe 3 · R$ 1.000,00</option>
        </select>
      </label>
      <Button type="submit" disabled={busy || accessLoading || !access || (isAdmin && repsLoading)} className="col-span-2 h-12 bg-gradient-red font-semibold">
        {busy ? "Salvando..." : "Salvar cliente"}
      </Button>
    </form>
  );
}
