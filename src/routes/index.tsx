import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  ShoppingCart,
  BookOpen,
  Users,
  ClipboardList,
  FilePenLine,
} from "lucide-react";
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
  const [area, setArea] = useState<"vender" | "catalogos" | null>(null);
  return (
    <div className="min-h-screen pb-12">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
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
        <p className="mt-4 text-xl text-muted-foreground">O que deseja fazer?</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <button
            className={`journey-choice ${area === "vender" ? "journey-active" : ""}`}
            aria-pressed={area === "vender"}
            onClick={() => setArea("vender")}
          >
            <ShoppingCart size={32} />
            <h2 className="mt-5 text-3xl font-bold">Vender</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Clientes, peças, pedidos e orçamentos. Revise tudo antes de enviar.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold">
              Abrir área de vendas <ArrowRight size={18} />
            </span>
          </button>
          <button
            className={`journey-choice ${area === "catalogos" ? "journey-active" : ""}`}
            aria-pressed={area === "catalogos"}
            onClick={() => setArea("catalogos")}
          >
            <BookOpen size={32} />
            <h2 className="mt-5 text-3xl font-bold">Ver catálogos</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Conheça as linhas FCO Automotive e HD Embreagens por fornecedor.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold">
              Escolher catálogo <ArrowRight size={18} />
            </span>
          </button>
        </div>
        {area === "vender" && (
          <section className="surface-card mt-7 p-6 sm:p-8" aria-label="Área de vendas">
            <h2 className="text-2xl font-bold">Tudo para sua próxima venda</h2>
            {access?.can_sell ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                dois catálogos abaixo.
              </p>
            )}
          </section>
        )}
        {(area === "catalogos" || (area === "vender" && !access?.can_sell)) && (
          <section className="mt-8" aria-label="Escolher fornecedor">
            <p className="mb-5 text-sm text-muted-foreground">
              Representante Oficial das Marcas · Escolha o catálogo que deseja visualizar.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
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
                <Link
                  key={supplier.brand}
                  to="/catalogo"
                  search={{ marca: supplier.brand as "FCO" | "HD", modo: "consulta" }}
                  className="supplier-choice surface-card"
                >
                  <div className="supplier-logo">
                    <img src={supplier.image} alt={supplier.name} />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold">{supplier.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{supplier.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">
                    Ver catálogo <ArrowRight size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
