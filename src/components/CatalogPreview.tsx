import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CatalogDownload } from "@/components/CatalogDownload";
import { supabase } from "@/integrations/supabase/client";

export function CatalogPreview({
  brand,
  mode = "consulta",
}: {
  brand: "FCO" | "HD";
  mode?: "consulta" | "venda";
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    setPdfUrl(null);
    setError(false);
    setLoading(true);

    supabase.storage
      .from("catalogs")
      .download(`${brand.toLowerCase()}-catalogo.pdf`)
      .then(({ data, error: downloadError }) => {
        if (disposed) return;
        if (downloadError || !data) {
          setError(true);
          setLoading(false);
          return;
        }
        objectUrl = URL.createObjectURL(data);
        setPdfUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (disposed) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [brand]);

  return (
    <section className="catalog-preview" aria-label={`Visualização do catálogo ${brand}`}>
      <div className="catalog-preview-heading">
        <div>
          <span className="eyebrow">CATÁLOGO DIGITAL</span>
          <h2>Visualização do catálogo {brand}</h2>
          <p>Consulte as páginas aqui ou baixe o arquivo em PDF.</p>
        </div>
        <div className="catalog-preview-actions">
          {(["FCO", "HD"] as const).map((option) => (
            <Link
              key={option}
              to="/catalogo"
              search={{ marca: option, modo }}
              className={`catalog-brand-option ${brand === option ? "is-active" : ""}`}
              aria-label={`Visualizar catálogo ${option}`}
              aria-current={brand === option ? "page" : undefined}
            >
              {option}
            </Link>
          ))}
          <CatalogDownload brand={brand} className="catalog-preview-download" />
        </div>
      </div>

      <div className="catalog-preview-frame">
        {loading && <p role="status">Carregando catálogo {brand}…</p>}
        {error && (
          <p role="alert">
            Não foi possível carregar a visualização agora. Você ainda pode tentar baixar o PDF acima.
          </p>
        )}
        {pdfUrl && <iframe key={brand} src={pdfUrl} title={`Catálogo ${brand} em PDF`} />}
      </div>
    </section>
  );
}
