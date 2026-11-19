import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";

/** Rota antiga: abre a seção "vendas" do painel administrativo único. */
export const Route = createFileRoute("/_authenticated/vendas-por-representante")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    throw redirectToAdmin("vendas", location.hash);
  },
});
