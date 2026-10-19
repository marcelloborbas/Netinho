import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Settings, LogIn, ShieldCheck, MapPinned, Truck } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { accessQuery, selectedProfile } from "@/lib/access";
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
  const firstName = access?.name?.trim().split(/\s+/)[0];
  const savedRole = access?.email ? selectedProfile(access.email) : null;
  const role = access?.level === 1 ? "Administrador" : access?.attribution === "Representante"
    ? "Representante Comercial"
    : access?.attribution === "Cliente"
      ? "Cliente"
      : access?.can_sell
        ? (savedRole === "Vendedor" ? "Vendedor" : "Representante Comercial")
        : savedRole === "Auto-Peças" || savedRole === "Distribuidor"
          ? savedRole
          : "Visitante";
  return (
    <div className="home-page flex min-h-screen flex-col pb-12" style={{ height: "auto", minHeight: "100svh", overflow: "visible" }}>
      <BrandHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12" style={{ display: "block", overflow: "visible", minHeight: "auto", paddingTop: 24, paddingBottom: 32 }}>
        <div className="home-greeting-row">
          <h1 className="text-4xl font-bold sm:text-5xl">
            {greeting(firstName || "Visitante")}
          </h1>
          <span className="home-attribution-badge">
            {role}
          </span>
        </div>
        <p className="mt-4 text-xl text-muted-foreground">O que deseja fazer?</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {access?.level === 1 ? (
            <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-400/60 px-4 py-2 text-sm font-bold">
              <Settings size={18} /> Painel de Administração
            </Link>
          ) : (
            <Link to="/auth" className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold">
              <LogIn size={18} /> Identificar-me / Administração
            </Link>
          )}
        </div>
        <PromotionBanner />
        <div className="home-panels mt-5 grid items-stretch gap-5 lg:grid-cols-1" style={{ gridTemplateColumns: "minmax(0, 1fr)", marginTop: 20, marginBottom: 24 }}>
          <section className="journey-choice" aria-labelledby="selling-title" style={{ width: "100%", minHeight: "auto", padding: 18 }}>
            <div className="home-panel-heading">
              <div>
                <h2 id="selling-title">Vender</h2>
                <p>Tudo preparado para sua próxima venda</p>
              </div>
              <span className="home-panel-icon"><ShoppingCart size={22} aria-hidden="true" /></span>
            </div>
                <div className="home-sales-actions mt-6 grid grid-cols-2 gap-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <Link to={access?.can_sell || access?.level === 1 ? "/clientes" : "/catalogo"} search={access?.can_sell || access?.level === 1 ? undefined : { modo: "consulta" }} className="action-card" title={access?.can_sell || access?.level === 1 ? "Clientes" : "Consulte o catálogo; operações comerciais exigem autorização"}>
                    <Users className="text-primary" />
                    <h3 className="mt-4 font-bold">Clientes</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Cadastrar ou selecionar</p>
                  </Link>
                  <Link to="/catalogo" search={{ modo: access?.can_sell || access?.level === 1 ? "venda" : "consulta" }} className="action-card">
                    <ShoppingCart className="text-primary" />
                    <h3 className="mt-4 font-bold">Montar venda</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Escolher peças e condições</p>
                  </Link>
                  <Link to={access?.can_sell || access?.level === 1 ? "/pedido" : "/catalogo"} search={access?.can_sell || access?.level === 1 ? undefined : { modo: "consulta" }} className="action-card" title={access?.can_sell || access?.level === 1 ? "Editar e revisar" : "Consulte o catálogo; operações comerciais exigem autorização"}>
                    <FilePenLine className="text-primary" />
                    <h3 className="mt-4 font-bold">Editar e revisar</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Conferir pedido atual</p>
                  </Link>
                  <Link to={access?.can_sell || access?.level === 1 ? "/pedidos" : "/catalogo"} search={access?.can_sell || access?.level === 1 ? undefined : { modo: "consulta" }} className="action-card" title={access?.can_sell || access?.level === 1 ? "Meus pedidos" : "Consulte o catálogo; operações comerciais exigem autorização"}>
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
        </div>
        {access?.level === 1 && (
          <section className="journey-choice mt-5" aria-labelledby="admin-home-title">
            <div className="home-panel-heading">
              <div><h2 id="admin-home-title">Administração e cadastros</h2><p>Gerencie os cadastros e as operações comerciais.</p></div>
              <span className="home-panel-icon"><ShieldCheck size={22} /></span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Link to="/admin" className="action-card"><Settings className="text-primary" /><h3 className="mt-2 font-bold">Painel geral</h3><p className="text-xs text-muted-foreground">Autorizações e produtos</p></Link>
              <Link to="/representante" className="action-card"><MapPinned className="text-primary" /><h3 className="mt-2 font-bold">Representantes</h3><p className="text-xs text-muted-foreground">Fichas e mapas</p></Link>
              <Link to="/admin" className="action-card"><Truck className="text-primary" /><h3 className="mt-2 font-bold">Distribuidoras</h3><p className="text-xs text-muted-foreground">Fornecedores e produtos</p></Link>
              <Link to="/clientes" className="action-card"><Users className="text-primary" /><h3 className="mt-2 font-bold">Clientes</h3><p className="text-xs text-muted-foreground">Cadastros</p></Link>
              <Link to="/pedidos" className="action-card"><ClipboardList className="text-primary" /><h3 className="mt-2 font-bold">Pedidos</h3><p className="text-xs text-muted-foreground">Acompanhamento</p></Link>
            </div>
          </section>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}
