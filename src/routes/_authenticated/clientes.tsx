import { createFileRoute } from "@tanstack/react-router";
import { redirectToAdmin } from "@/lib/admin-redirect";
import { CustomersManager } from "@/components/customers/CustomersManager";

export const Route = createFileRoute("/_authenticated/clientes")({
  staticData: { sitemap: false },
  // O administrador gerencia clientes dentro do painel único; vendedores seguem com a carteira aqui.
  beforeLoad: ({ context }) => {
    if (context.access?.level === 1) throw redirectToAdmin("clientes");
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://www.netinhoautoparts.live/clientes" },
      { title: "Clientes – NETINHO" },
      { name: "description", content: "Cadastro e seleção de clientes para pedidos." },
      { property: "og:title", content: "Clientes – NETINHO" },
      { property: "og:description", content: "Cadastro e seleção de clientes para pedidos." },
    ],
  }),
  component: CustomersManager,
});
