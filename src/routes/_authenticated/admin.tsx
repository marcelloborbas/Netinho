import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { pageHead } from "@/lib/page-head";
import { meQuery } from "@/lib/queries";
import { DEFAULT_ADMIN_SECTION, isAdminSection, type AdminSectionId } from "@/lib/admin-sections";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { secao?: AdminSectionId | undefined } => ({
    secao: isAdminSection(search["secao"]) ? search["secao"] : undefined,
  }),
  head: () =>
    pageHead(
      "/admin",
      "Painel administrativo | Netinho Auto Parts",
      "Central única da administração da Netinho Auto Parts para usuários autorizados.",
    ),
  component: AdminPage,
});

function AdminPage() {
  const { secao } = Route.useSearch();
  const { data: me, isLoading } = useQuery(meQuery);
  if (isLoading) return <p className="p-5">Carregando administração…</p>;
  if (!me?.isAdmin)
    return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;
  return <AdminPanel section={secao ?? DEFAULT_ADMIN_SECTION} />;
}
