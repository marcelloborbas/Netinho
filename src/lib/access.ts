import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessType } from "@/components/ProfileAvatar";
export interface AccessContext {
  level: 1 | 2 | 3;
  can_sell: boolean;
  name: string;
  email: string;
}
export const accessQuery = queryOptions({
  queryKey: ["access"],
  staleTime: 30_000,
  retry: false,
  queryFn: async (): Promise<AccessContext> => {
    const { data, error } = await supabase.rpc("access_context");
    if (error) throw new Error("Não foi possível verificar seu acesso.");
    const result = data as unknown as AccessContext;
    if (!result || ![1, 2, 3].includes(result.level)) throw new Error("Acesso não reconhecido.");
    return result;
  },
});
export function selectedProfile(email: string): AccessType | null {
  if (typeof window === "undefined") return null;
  try {
    const p = JSON.parse(localStorage.getItem("netinho-vendedor") ?? "null");
    return p?.email === email &&
      ["Representante Comercial", "Visitante", "Distribuidor", "Auto-Peças"].includes(p.accessType)
      ? p.accessType
      : null;
  } catch {
    return null;
  }
}
export function saveProfile(access: AccessContext, accessType: AccessType) {
  localStorage.setItem(
    "netinho-vendedor",
    JSON.stringify({ name: access.name, email: access.email, accessType }),
  );
}
