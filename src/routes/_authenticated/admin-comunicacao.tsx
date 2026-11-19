import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";

/** Rota antiga: abre a seção "comunicacao" do painel administrativo único. */
export const Route = createFileRoute("/_authenticated/admin-comunicacao")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    throw redirectToAdmin("comunicacao", location.hash);
  },
});
