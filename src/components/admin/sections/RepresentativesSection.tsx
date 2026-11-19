import { Link } from "@tanstack/react-router";
import { ExternalLink, MapPinned, Pencil, Users } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const PUBLIC_PROFILES = [
  {
    name: "Abdenego Eugênio",
    region: "Vale do Paraíba e Litoral Norte",
    page: "/representante",
    slug: "abdenego-eugenio",
  },
  {
    name: "Livaldo Souza Silva",
    region: "Sorocaba e região",
    page: "/representante-livaldo",
    slug: "livaldo-souza-silva",
  },
] as const;

const linkClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold hover:border-gold";

/** Atalhos do mapa, diretório e fichas públicas; a edição completa fica em Pessoas e Comissões. */
export function RepresentativesSection() {
  return (
    <div className="space-y-3 text-navy">
      <AdminSectionHeader
        icon={MapPinned}
        title="Representantes"
        description="Mapa, diretório e fichas públicas dos representantes"
      />
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Mapa e diretório">
        <Link
          to="/representantes-mapa"
          className="rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-gold"
        >
          <strong className="flex items-center gap-2 text-sm">
            <MapPinned size={17} className="text-gold-deep" aria-hidden="true" />
            Mapa de representantes
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Por estado, com edição rápida de contato e comissão.
          </span>
        </Link>
        <Link
          to="/representantes"
          className="rounded-2xl border border-border bg-card p-3 shadow-sm hover:border-gold"
        >
          <strong className="flex items-center gap-2 text-sm">
            <Users size={17} className="text-gold-deep" aria-hidden="true" />
            Diretório e regiões
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Lista pública de representantes e áreas de atuação.
          </span>
        </Link>
        <Link
          to="/admin"
          search={{ secao: "pessoas" }}
          hash="representantes"
          className="rounded-2xl border border-gold/60 bg-gold-soft/30 p-3 shadow-sm hover:border-gold"
        >
          <strong className="flex items-center gap-2 text-sm">
            <Pencil size={17} className="text-gold-deep" aria-hidden="true" />
            Editar fichas completas
          </strong>
          <span className="mt-1 block text-xs text-muted-foreground">
            Dados, acesso, comissão, carteira e região em Pessoas e Comissões.
          </span>
        </Link>
      </section>
      <section
        className="rounded-2xl border border-border bg-card p-3 shadow-sm"
        aria-label="Fichas públicas"
      >
        <h3 className="mb-2 text-sm font-black">Fichas públicas com página própria</h3>
        <ul className="divide-y divide-border">
          {PUBLIC_PROFILES.map((profile) => (
            <li key={profile.slug} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{profile.name}</strong>
                <span className="text-xs text-muted-foreground">{profile.region}</span>
              </span>
              <Link to={profile.page} className={linkClass}>
                <ExternalLink size={14} aria-hidden="true" />
                Ver página
              </Link>
              <Link
                to="/editar-representante/$slug"
                params={{ slug: profile.slug }}
                className={linkClass}
              >
                <Pencil size={14} aria-hidden="true" />
                Editar ficha
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
