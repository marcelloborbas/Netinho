import { redirect } from "@tanstack/react-router";
import { normalizeHash, type AdminSectionId } from "@/lib/admin-sections";

/**
 * Redireciona uma rota administrativa antiga para a seção correspondente do
 * painel único, preservando a âncora (ex.: ficha de uma pessoa).
 */
export function redirectToAdmin(secao: AdminSectionId, hash?: string) {
  const anchor = normalizeHash(hash);
  return redirect({
    to: "/admin",
    search: { secao },
    ...(anchor ? { hash: anchor } : {}),
    replace: true,
  });
}
