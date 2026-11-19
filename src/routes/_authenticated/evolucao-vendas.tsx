import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, ShieldCheck, UsersRound } from "lucide-react";
import { HomeSalesEvolution } from "@/components/HomeSalesEvolution";
import { meQuery } from "@/lib/queries";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/evolucao-vendas")({
  staticData: { sitemap: false },
  head: () => pageHead("/evolucao-vendas", "Evolução das Vendas | Netinho Auto Parts", "Painel administrativo de evolução das vendas da Netinho Auto Parts."),
  component: EvolutionPage,
});

function EvolutionPage() {
  const { data: me, isLoading, isError } = useQuery(meQuery);
  if (isLoading) return <main className="p-6 text-center text-[#102a52]">Verificando autorização administrativa…</main>;
  if (isError || !me?.isAdmin) return <main className="mx-auto max-w-xl p-6"><div role="alert" className="rounded-2xl border border-[#d4af37] bg-white p-6 text-center text-[#102a52]"><ShieldCheck className="mx-auto mb-3 text-[#a67c18]" size={36}/><h1 className="text-lg font-black">Acesso exclusivo do Administrador</h1><p className="mt-2 text-sm">Os resultados consolidados da Netinho são restritos à administração.</p><Link to="/" className="mt-4 inline-block font-bold underline">Voltar ao início</Link></div></main>;
  return <main className="mx-auto w-full max-w-5xl space-y-4 bg-[#f1f1f1] px-2 py-4 pb-28 text-[#102a52] sm:px-5">
    <header className="rounded-2xl border border-[#d4af37] bg-[#102a52] px-4 py-5 text-center shadow-sm">
      <div className="flex items-center justify-center gap-2 text-[#ffe19a]"><BarChart3 size={25}/><h1 className="text-xl font-black uppercase tracking-wide sm:text-3xl">Evolução das Vendas</h1></div>
      <p className="mt-2 text-xs font-semibold text-white sm:text-sm">Consolidado dos últimos seis meses · atualização pelos pedidos registrados</p>
    </header>
    <HomeSalesEvolution />
    <Link to="/vendas-por-representante" className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-[#d4af37] bg-white px-4 py-3 text-[#102a52] shadow-sm transition hover:bg-[#fff8e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4af37]">
      <UsersRound size={26} className="shrink-0 text-[#ae801c]"/><span className="min-w-0 flex-1"><strong className="block text-sm sm:text-base">Ver vendas por representantes</strong><span className="block text-xs text-[#52627a]">Ranking, destaque do mês e composição mensal</span></span><ArrowRight size={22} className="shrink-0"/>
    </Link>
    <p className="px-2 text-xs leading-relaxed text-[#52627a]">Os valores refletem pedidos registrados, desconsiderando orçamentos e cancelamentos. As comissões apresentadas são estimativas calculadas com as taxas cadastradas.</p>
  </main>;
}
