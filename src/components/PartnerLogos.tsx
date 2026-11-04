import { CatalogDownload } from "@/components/CatalogDownload";
import { Link } from "@tanstack/react-router";
export function PartnerLogos({
  compact = false,
  downloads = false,
  linked = true,
}: {
  compact?: boolean;
  downloads?: boolean;
  linked?: boolean;
}) {
  return (
    <div
      className={compact ? "partner-logos partner-logos-compact" : "partner-logos"}
      aria-label="Marcas representadas"
    >
      {(
        [
          { brand: "FCO", name: "FCO Automotive", image: "/images/brands/fco.webp" },
        ] as const
      ).map((s) => (
        <div key={s.brand} className="flex flex-col items-center">
          {downloads && compact ? (
            <CatalogDownload brand={s.brand} iconOnly image={s.image} name={s.name} className="partner-logo" />
          ) : linked ? (
            <Link
              to="/catalogo"
              search={{ marca: s.brand, modo: "consulta" }}
              className="partner-logo"
              aria-label={`Ver catálogo ${s.name}`}
            >
              <img src={s.image} alt={compact ? "" : s.name} loading="lazy" decoding="async" />
            </Link>
          ) : (
            <span className="partner-logo">
              <img src={s.image} alt={s.name} loading="lazy" decoding="async" />
            </span>
          )}
          {!compact && downloads && <CatalogDownload brand={s.brand} />}
        </div>
      ))}
    </div>
  );
}
