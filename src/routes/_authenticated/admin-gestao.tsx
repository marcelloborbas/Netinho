import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";
import { normalizeHash } from "@/lib/admin-sections";

/** Antigo hub administrativo: abre o painel único (#representantes → Pessoas). */
export const Route = createFileRoute("/_authenticated/admin-gestao")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    const anchor = normalizeHash(location.hash);
    throw anchor === "representantes"
      ? redirectToAdmin("pessoas", anchor)
      : redirectToAdmin("visao-geral");
  },
});
