import { Link } from "@tanstack/react-router";
export function PartnerLogos({ compact = false }: { compact?: boolean }) {
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
          <Link
            to="/catalogo"
            search={{ marca: s.brand, modo: "consulta" }}
            className="partner-logo"
            aria-label={`Ver catálogo ${s.name}`}
          >
            <img src={s.image} alt={compact ? "" : s.name} />
          </Link>
          {!compact && (
            <a
              href={`/catalog/${s.brand.toLowerCase()}-catalogo.pdf`}
              download
              className="supplier-download"
            >
              Baixar PDF {s.brand}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
