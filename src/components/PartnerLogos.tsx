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
        <div key={s.brand} className={s.brand === "HD" ? "flex flex-col items-center opacity-65 grayscale" : ""}>
          {s.brand === "HD" ? (
            <span className="partner-logo cursor-not-allowed" aria-label="HD Embreagens — em breve" aria-disabled="true">
              <img src={s.image} alt={s.name} />
            </span>
          ) : downloads && compact ? (
            <CatalogDownload brand={s.brand} iconOnly image={s.image} name={s.name} className="partner-logo" />
          ) : linked ? (
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
          {s.brand === "HD" && <span className="block text-center text-xs font-extrabold text-zinc-500">Em breve</span>}
          {s.brand !== "HD" && !compact && downloads && <CatalogDownload brand={s.brand} />}
        </div>
      ))}
    </div>
  );
}
