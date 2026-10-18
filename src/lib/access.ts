import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessType } from "@/components/ProfileAvatar";
export interface AccessContext {
  level: 1 | 2 | 3;
  can_sell: boolean;
  name: string;
  email: string;
  attribution?: "Representante" | "Visitante" | "Cliente";
}
export const accessQuery = queryOptions({
  queryKey: ["access"],
  staleTime: 30_000,
  retry: false,
  queryFn: async ({ signal }): Promise<AccessContext> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const cancel = () => controller.abort();
    signal.addEventListener("abort", cancel, { once: true });
    let data;
    let error;
    try {
      ({ data, error } = await supabase
        .rpc("access_context")
        .abortSignal(controller.signal));
    } catch (cause) {
      if (controller.signal.aborted && !signal.aborted) {
        throw new Error("A verificação do seu acesso demorou mais que o esperado. Tente novamente.");
      }
      throw cause;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
    }
    if (error) {
      if (controller.signal.aborted && !signal.aborted) {
        throw new Error("A verificação do seu acesso demorou mais que o esperado. Tente novamente.");
      }
      throw new Error("Não foi possível verificar seu acesso.");
    }
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
