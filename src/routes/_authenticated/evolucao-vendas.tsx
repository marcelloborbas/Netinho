import { createFileRoute } from "@tanstack/react-router";
import { HomeSalesEvolution } from "@/components/HomeSalesEvolution";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/evolucao-vendas")({
  staticData: { sitemap: false },
  head: () => pageHead("/evolucao-vendas", "Evolução das Vendas | Netinho Auto Parts", "Acompanhe a evolução das vendas da Netinho Auto Parts."),
  component: EvolutionPage,
});

function EvolutionPage() {
  return <main className="mx-auto w-full max-w-5xl space-y-4 px-2 py-4 sm:px-5">
    <header className="rounded-2xl border border-[#d4af37] bg-[#102a52] px-4 py-4 text-center shadow-sm">
      <h1 className="text-xl font-black uppercase tracking-wide text-[#ffe19a] sm:text-3xl">Evolução das Vendas</h1>
      <p className="mt-1 text-xs font-semibold text-white sm:text-sm">Acompanhamento mensal dos resultados</p>
    </header>
    <HomeSalesEvolution />
  </main>;
}
