import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";

/** Rota antiga: abre a seção "pedidos" do painel administrativo único. */
export const Route = createFileRoute("/_authenticated/admin-pedidos")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    throw redirectToAdmin("pedidos", location.hash);
  },
});
