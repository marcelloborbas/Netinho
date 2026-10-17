import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, MessageCircle, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
type Representative = { slug: string; full_name: string; region: string; phone: string | null };
export function RepresentativeDirectory({ product = "" }: { product?: string }) {
  const [region, setRegion] = useState("");
  const { data: reps = [], error } = useQuery({
    queryKey: ["representative-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("representative_profiles")
        .select("slug,full_name,region,phone")
        .order("full_name");
      if (error) throw error;
      return data as Representative[];
    },
  });
  const filtered = reps.filter(
    (r) =>
      !r.region.toLowerCase().includes("teste") &&
      (!region ||
        `${r.region} ${r.full_name}`
          .toLocaleLowerCase("pt-BR")
          .includes(region.toLocaleLowerCase("pt-BR"))),
  );
  return (
    <section id="representantes" className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">ATENDIMENTO DE VERDADE</span>
          <h2 className="mt-2 text-3xl font-bold">Perto de você. Do seu negócio.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulte disponibilidade, valores e condições com o representante da sua região.
          </p>
        </div>
        <a
          className="text-sm font-semibold text-primary"
          href={`https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent(`Olá! Gostaria de falar com o representante da minha região.${product ? ` Tenho interesse em ${product}.` : ""}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Encontrar meu representante ↗
        </a>
      </div>
      <input
        className="mt-5 h-12 w-full max-w-md rounded-xl border bg-secondary/40 px-4 text-sm"
        aria-label="Buscar representante por região"
        placeholder="Busque sua região ou representante"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((rep) => (
          <div key={rep.slug} className="surface-card p-5">
            <span className="flex items-center gap-2 text-xs text-primary">
              <MapPin size={15} />
              {rep.region}
            </span>
            <h3 className="mt-3 text-2xl font-bold">{rep.full_name}</h3>
            <a
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
              href={`https://wa.me/${rep.phone?.replace(/\D/g, "") ? (rep.phone.replace(/\D/g, "").startsWith("55") ? rep.phone.replace(/\D/g, "") : `55${rep.phone.replace(/\D/g, "")}`) : BRAND.phoneDigits}?text=${encodeURIComponent(`Olá! Gostaria de atendimento com ${rep.full_name} para ${rep.region}.${product ? ` Peça: ${product}.` : ""}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} />
              Solicitar atendimento <ArrowUpRight size={14} />
            </a>
          </div>
        ))}
      </div>
      {(error || !filtered.length) && (
        <p className="mt-4 text-sm text-muted-foreground">
          {error ? "A lista de representantes não carregou." : "Não encontrou sua região?"} Fale com
          a central Netinho para encaminharmos seu atendimento.
        </p>
      )}
    </section>
  );
}
