import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Users, ClipboardList, FilePenLine, Settings, ShieldCheck, MapPinned, Truck } from "lucide-react";
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
    <div className="home-page flex min-h-screen flex-col" style={{ minHeight: "100svh" }}>
      <BrandHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 12px" }}>
        <h1 className="text-center text-xl font-bold text-amber-300 sm:text-3xl">O que o Sr. deseja fazer?</h1>
        <nav aria-label="Escolha uma ação" className="grid w-full max-w-xl grid-cols-2 gap-3 self-center">
          <Link to={access?.can_sell || access?.level === 1 ? "/clientes" : "/auth"} className="action-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-amber-400/50 text-center">
            <ShoppingCart className="h-8 w-8 text-amber-300" />
            <span className="font-bold">Vender</span>
          </Link>
          <Link to="/catalogo" search={{ modo: "consulta" }} className="action-card flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-amber-400/50 text-center">
            <FilePenLine className="h-8 w-8 text-amber-300" />
            <span className="font-bold">Orçamento</span>
          </Link>
        </nav>
        <PromotionBanner />
      </main>
      <BrandFooter />
    </div>
  );
}
