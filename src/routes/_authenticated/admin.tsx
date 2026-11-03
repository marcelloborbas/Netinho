import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração – NETINHO" }] }),
  component: () => <Navigate to="/admin-gestao" replace />,
});
