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
          { brand: "HD", name: "HD Embreagens", image: "/images/brands/hd.png" },
        ] as const
      ).map((s) => (
        <div key={s.brand}>
          {linked ? (
            <Link
              to="/catalogo"
              search={{ marca: s.brand, modo: "consulta" }}
              className="partner-logo"
              aria-label={`Ver catálogo ${s.name}`}
            >
              <img src={s.image} alt={compact ? "" : s.name} />
            </Link>
          ) : (
            <span className="partner-logo">
              <img src={s.image} alt={s.name} />
            </span>
          )}
          {!compact && downloads && <CatalogDownload brand={s.brand} />}
        </div>
      ))}
    </div>
  );
}
