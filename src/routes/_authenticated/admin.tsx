import { pageHead } from "@/lib/page-head";
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => pageHead("/admin", "Central administrativa | Netinho Auto Parts", "Acesso à central administrativa da Netinho Auto Parts para usuários autorizados."),
  component: () => <Navigate to="/admin-gestao" replace />,
});
