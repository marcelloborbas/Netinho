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
          { brand: "JCREI", name: "JC REI", image: "/images/brands/Logo.webp" },
        ] as const
      ).map((s) => (
        <div key={s.brand} className={s.brand === "HD" || s.brand === "JCREI" ? "flex flex-col items-center" : "flex flex-col items-center"}>
          {s.brand === "HD" || s.brand === "JCREI" ? (
            <span className="partner-logo cursor-not-allowed opacity-65 grayscale" aria-label={`${s.name} — em breve`} aria-disabled="true">
              <img src={s.image} alt={s.name} loading="lazy" decoding="async" />
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
              <img src={s.image} alt={compact ? "" : s.name} loading="lazy" decoding="async" />
            </Link>
          ) : (
            <span className="partner-logo">
              <img src={s.image} alt={s.name} loading="lazy" decoding="async" />
            </span>
          )}
          {(s.brand === "HD" || s.brand === "JCREI") && <span className="partner-coming-soon block w-full text-center text-xs font-extrabold text-zinc-400">Em breve</span>}
          {s.brand !== "HD" && s.brand !== "JCREI" && !compact && downloads && <CatalogDownload brand={s.brand} />}
        </div>
      ))}
    </div>
  );
}
