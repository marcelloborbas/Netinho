import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";

/** Rota antiga: abre a seção "cadastros" do painel administrativo único. */
export const Route = createFileRoute("/cadastros-pendentes")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    throw redirectToAdmin("cadastros", location.hash);
  },
});
