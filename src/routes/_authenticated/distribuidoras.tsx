import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";

/** Rota antiga: abre a seção "fornecedores" do painel administrativo único. */
export const Route = createFileRoute("/_authenticated/distribuidoras")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    throw redirectToAdmin("fornecedores", location.hash);
  },
});
