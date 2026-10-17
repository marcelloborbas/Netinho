import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine } from "lucide-react";
import { PartnerLogos } from "@/components/PartnerLogos";
import { Territory } from "@/components/Territory";
import { Logo } from "@/components/Logo";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { greeting } from "@/components/ProfileAvatar";
import { BRAND } from "@/lib/brand";
export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    await context.queryClient.fetchQuery(accessQuery);
  },
  head: () => ({ meta: [{ title: "O que deseja fazer? | Netinho Auto Parts" }] }),
  component: Home,
});
function Home() {
  const { data: access } = useQuery(accessQuery);
  return (
    <div className="home-page min-h-screen pb-12">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Logo />
            <PartnerLogos compact />
          </div>
          <div className="flex gap-2">
            {access?.level === 1 && (
              <Link to="/admin" className="nav-link">
                Administração
              </Link>
            )}
            <Link to="/auth" className="nav-link">
              Minha conta
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <span className="eyebrow">BEM-VINDO À NETINHO AUTO PARTS</span>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
          {greeting(`Sr. ${access?.name.split(" ")[0] || "Usuário"}`)}
        </h1>
        <Territory email={access?.email} />
        <p className="mt-4 text-xl text-muted-foreground">O que deseja fazer?</p>
        <div className="mt-8 grid items-start gap-5 lg:grid-cols-2">
          <section className="journey-choice" aria-labelledby="selling-title">
            <ShoppingCart size={32} aria-hidden="true" />
            <h2 id="selling-title" className="mt-5 text-3xl font-bold">
              Vender
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Tudo para sua próxima venda. Escolha o que deseja fazer.
            </p>
            {access?.can_sell ? (
              <>
                <div className="mt-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                  <Link to="/clientes" className="action-card">
                    <Users className="text-primary" />
                    <h3 className="mt-4 font-bold">Clientes</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Cadastrar ou selecionar</p>
                  </Link>
                  <Link to="/catalogo" search={{ modo: "venda" }} className="action-card">
                    <ShoppingCart className="text-primary" />
                    <h3 className="mt-4 font-bold">Montar venda</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Escolher peças e condições</p>
                  </Link>
                  <Link to="/pedido" className="action-card">
                    <FilePenLine className="text-primary" />
                    <h3 className="mt-4 font-bold">Editar e revisar</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Conferir pedido atual</p>
                  </Link>
                  <Link to="/pedidos" className="action-card">
                    <ClipboardList className="text-primary" />
                    <h3 className="mt-4 font-bold">Meus pedidos</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Histórico, PDF e envio</p>
                  </Link>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  Cliente → Peças → Editar e revisar → Registrar → Enviar para{" "}
                  <strong className="text-foreground">{BRAND.orderEmail}</strong>.
                </p>
              </>
            ) : (
              <p className="mt-4 text-muted-foreground">
                O acesso a vendas precisa ser autorizado pela Netinho. Você já pode consultar os
                dois catálogos na área Ver catálogos.
              </p>
            )}
          </section>
          <section className="journey-choice" aria-labelledby="catalogs-title">
            <h2 id="catalogs-title" className="text-xl font-bold">
              Ver catálogos
            </h2>
            <div className="home-catalog-logos">
              {[
                {
                  brand: "FCO",
                  name: "FCO Automotive",
                  image: "/images/brands/fco.webp",
                  text: "Peças, referências e aplicações da linha FCO.",
                },
                {
                  brand: "HD",
                  name: "HD Embreagens",
                  image: "/images/brands/hd.png",
                  text: "Embreagens, componentes e fichas do catálogo HD.",
                },
              ].map((supplier) => (
                <div key={supplier.brand}>
                  <Link
                    to="/catalogo"
                    search={{ marca: supplier.brand as "FCO" | "HD", modo: "consulta" }}
                    className="home-catalog-link"
                    aria-label={`Ver catálogo ${supplier.name}`}
                  >
                    <div className="supplier-logo">
                      <img src={supplier.image} alt={supplier.name} />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
