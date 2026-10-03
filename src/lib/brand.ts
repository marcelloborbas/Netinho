/** Dados fixos da marca e regras comerciais compartilhadas. */
export const BRAND = {
  name: "NETINHO",
  tagline: "Representações · Auto Parts",
  phone: "(15) 9.9169-7105",
  phoneDigits: "5515991697105",
  /** E-mail que recebe os pedidos (a confirmar com o cliente). */
  orderEmail: "vendas1@fcoautomotive.com",
} as const;

export type PaymentTerm = "cash" | "30" | "30_45_60" | "30_45_60_75";

export const PAYMENT_TERMS: { value: PaymentTerm; label: string; short: string }[] = [
  { value: "cash", label: "À vista (atacado líquido)", short: "À vista" },
  { value: "30", label: "30 dias", short: "30" },
  { value: "30_45_60", label: "30/45/60 dias", short: "30/45/60" },
  { value: "30_45_60_75", label: "30/45/60/75 dias", short: "30/45/60/75" },
];

export const termLabel = (t: string) => PAYMENT_TERMS.find((p) => p.value === t)?.label ?? t;

export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  sent: { label: "Enviado", tone: "bg-primary/15 text-primary" },
  received: { label: "Recebido", tone: "bg-warning/15 text-warning" },
  processing: { label: "Em separação", tone: "bg-warning/15 text-warning" },
  invoiced: { label: "Faturado", tone: "bg-success/15 text-success" },
  cancelled: { label: "Cancelado", tone: "bg-muted text-muted-foreground" },
};

export const brl = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
