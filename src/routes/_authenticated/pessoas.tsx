import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";

/** Rota antiga: abre a seção "pessoas" do painel administrativo único. */
export const Route = createFileRoute("/_authenticated/pessoas")({
  staticData: { sitemap: false },
  beforeLoad: ({ location }) => {
    throw redirectToAdmin("pessoas", location.hash);
  },
});
