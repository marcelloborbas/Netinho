import { BriefcaseBusiness, Store, Truck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccessType = "Vendedor" | "Visitante" | "Distribuidor" | "Auto-Peças";

const ICONS = {
  "Vendedor": BriefcaseBusiness,
  "Visitante": UserRound,
  "Distribuidor": Truck,
  "Auto-Peças": Store,
} as const;

export function ProfileAvatar({ type, className }: { type: AccessType; className?: string }) {
  const Icon = ICONS[type];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary", className)}>
      <Icon className="h-1/2 w-1/2" strokeWidth={2.2} />
    </span>
  );
}

export function greeting(name: string) {
  const hour = new Date().getHours();
  const period = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return `${period}, ${name || "seja bem-vindo"}!`;
}
