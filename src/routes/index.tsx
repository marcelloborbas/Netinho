import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, BookOpen } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { greeting } from "@/components/ProfileAvatar";
import { BRAND } from "@/lib/brand";
import { PromotionBanner } from "@/components/PromotionBanner";
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "O que deseja fazer? | Netinho Auto Parts" },
    { name: "description", content: "Sua área Netinho para consultar catálogos, selecionar clientes e acompanhar pedidos." },
    { property: "og:title", content: "O que deseja fazer? | Netinho Auto Parts" },
    { property: "og:description", content: "Sua área Netinho para consultar catálogos, selecionar clientes e acompanhar pedidos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Home,
});
function Home() {
  const { data: access } = useQuery({ ...accessQuery, retry: false });
  return (
    <div className="home-page flex min-h-screen flex-col pb-12">
      <BrandHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <div className="home-greeting-row">
          <h1 className="text-4xl font-bold sm:text-5xl">
            {access ? greeting(`Sr. ${access.name.split(" ")[0]}`) : "Seja bem-vindo à Netinho Auto Parts"}
          </h1>
          <span className="home-attribution-badge">
            {access?.attribution ?? "Visitante"}
          </span>
        </div>
        <p className="mt-4 text-xl text-muted-foreground">O que deseja fazer?</p>
        <PromotionBanner />
        <div className="home-panels mt-8 grid items-stretch gap-5 lg:grid-cols-2">
          <section className="journey-choice" aria-labelledby="selling-title">
            <div className="home-panel-heading">
              <div>
                <h2 id="selling-title">Vender</h2>
                <p>Tudo preparado para sua próxima venda</p>
              </div>
              <span className="home-panel-icon"><ShoppingCart size={22} aria-hidden="true" /></span>
            </div>
                <div className="home-sales-actions mt-6 grid grid-cols-2 gap-3">
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
                <p className="home-sales-steps mt-6 text-sm text-muted-foreground">
                  Cliente → Peças → Editar e revisar → Registrar → Enviar para{" "}
                  <strong className="text-foreground">{BRAND.orderEmail}</strong>.
                </p>
          </section>
          <section className="journey-choice" aria-labelledby="catalogs-title">
            <div className="home-panel-heading">
              <div>
                <h2 id="catalogs-title">Ver catálogos</h2>
                <p>Encontre rapidamente a linha que procura</p>
              </div>
              <span className="home-panel-icon"><BookOpen size={22} aria-hidden="true" /></span>
            </div>
            <div className="home-catalog-logos">
              {[
                {
                  brand: "FCO",
                  name: "FCO Automotive",
                  image: "/images/brands/fco.webp",
                },
                {
                  brand: "HD",
                  name: "HD Embreagens",
                  image: "/images/brands/hd.png",
                },
              ].map((supplier) => (
                  <Link
                    key={supplier.brand}
                    to="/catalogo"
                    search={{ marca: supplier.brand as "FCO" | "HD", modo: "consulta" }}
                    className="home-catalog-link"
                    aria-label={`Ver catálogo ${supplier.name}`}
                  >
                    <div className="supplier-logo">
                      <img src={supplier.image} alt={supplier.name} />
                    </div>
                  </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
