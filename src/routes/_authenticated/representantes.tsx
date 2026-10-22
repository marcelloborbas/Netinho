import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { accessQuery } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/representantes")({ component: Page });
type Representative = { slug: string; full_name: string; region: string; phone: string | null };
type ServiceArea = { slug: string; service_cities: string | null };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const stateAliases: Record<string,string> = {SP:"sao paulo",RJ:"rio de janeiro",MG:"minas gerais",PR:"parana",SC:"santa catarina",RS:"rio grande do sul",ES:"espirito santo",BA:"bahia",GO:"goias",DF:"distrito federal",MT:"mato grosso",MS:"mato grosso do sul",PE:"pernambuco",CE:"ceara",PA:"para",AM:"amazonas",MA:"maranhao",PB:"paraiba",RN:"rio grande do norte",AL:"alagoas",SE:"sergipe",PI:"piaui",TO:"tocantins",RO:"rondonia",AC:"acre",AP:"amapa",RR:"roraima"};
function Page() {
  const { data: access } = useQuery(accessQuery);
  const [city,setCity] = useState("");
  const [state,setState] = useState("");
  const [searched,setSearched] = useState(false);
  const { data: reps = [], isLoading, error } = useQuery({
    queryKey: ["representative-directory"],
    queryFn: async () => {
      const { data,error } = await supabase.from("representative_profiles").select("slug,full_name,region,phone").order("full_name");
      if (error) throw error;
      return (data ?? []) as Representative[];
    },
  });
  const { data: serviceAreas = [] } = useQuery({ queryKey: ["representative-service-areas"], queryFn: async () => { const { data, error } = await supabase.from("representative_service_areas_public" as never).select("slug,service_cities"); if (error) throw error; return (data ?? []) as ServiceArea[]; } });
  const matches = useMemo(() => reps.filter(rep => {
    const region = normalize(rep.region ?? "");
    const serviceCities = normalize(serviceAreas.find(area => area.slug === rep.slug)?.service_cities ?? "");
    const cities = serviceCities.split(/[,;\n]+/).map(value => value.trim()).filter(Boolean);
    const cityMatch = cities.some(item => item === normalize(city) || item === `${normalize(city)}/${normalize(state)}` || item === `${normalize(city)} - ${normalize(state)}`) || (!cities.length && region.includes(normalize(city))) || /todo o brasil|territorio nacional|brasil inteiro/.test(region);
    const st = normalize(state);
    const stateMatch = region.includes(st) || (!!stateAliases[state.toUpperCase()] && region.includes(normalize(stateAliases[state.toUpperCase()]))) || /todo o brasil|territorio nacional|brasil inteiro/.test(region);
    return cityMatch && stateMatch && !region.includes("teste");
  }),[reps,serviceAreas,city,state]);
  const isNetinhoLocal = normalize(city) === "sorocaba" && state.trim().toUpperCase() === "SP";
  return <section className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
    <header className="rounded-2xl border border-amber-400/40 bg-[#102a52] p-5 text-center text-white">
      <MapPin className="mx-auto mb-2 text-amber-300" size={34}/>
      <h1 className="text-2xl font-black">Encontre seu representante</h1>
      <p className="mt-2 text-sm text-blue-100">Informe sua cidade e estado para localizar o atendimento de sua região.</p>
    </header>
    <form onSubmit={event => { event.preventDefault(); setSearched(true); }} className="grid gap-3 rounded-2xl border border-[#35536e] bg-[#061e37] p-4 sm:grid-cols-[1fr_160px_auto]">
      <label className="text-sm font-bold text-white">Cidade<input required value={city} onChange={e => {setCity(e.target.value);setSearched(false);}} placeholder="Ex.: Sorocaba" className="mt-2 min-h-12 w-full rounded-lg border border-[#42678b] bg-[#102a43] px-3 text-white placeholder:text-white/75" style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}/></label>
      <label className="text-sm font-bold text-white">Estado (UF)<input required maxLength={2} value={state} onChange={e => {setState(e.target.value.toUpperCase());setSearched(false);}} placeholder="SP" className="mt-2 min-h-12 w-full rounded-lg border border-[#42678b] bg-[#102a43] px-3 text-white placeholder:text-white/75" style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff" }}/></label>
      <button type="submit" className="flex min-h-12 items-center justify-center gap-2 self-end rounded-lg bg-[#0677ef] px-5 font-bold text-white"><Search size={18}/> Buscar</button>
    </form>
    {isLoading && <p>Carregando representantes...</p>}
    {error && <p role="alert">Não foi possível consultar os representantes. Tente novamente.</p>}
    {searched && !error && <div className="space-y-3">
      <h2 className="text-lg font-bold text-[#102a52]">{matches.length || isNetinhoLocal ? "Atendimento disponível para sua região" : "Nenhum representante identificado para essa localidade"}</h2>
      {isNetinhoLocal && <article className="rounded-xl border border-blue-900 bg-[#102a52] p-4 text-white"><h3 className="text-xl font-extrabold">Netinho Auto Parts</h3><p>Atendimento direto em Sorocaba / SP</p><a className="mt-3 inline-flex rounded-lg bg-green-700 px-4 py-3 font-bold text-white" href="https://wa.me/5515992458492" target="_blank" rel="noreferrer">Falar com a Netinho</a></article>}
      {matches.map(rep => <article key={rep.slug} className="rounded-xl border border-[#35536e] bg-[#102a52] p-4 text-white">
        <p className="text-xl font-extrabold text-white">{rep.full_name}</p>
        <p className="mt-1 flex items-center gap-2 text-sm"><MapPin size={15}/>{rep.region}</p>
        <a href={`https://wa.me/${(rep.phone?.replace(/\D/g,"") || "5515992458492").replace(/^(?!55)(?=\d{10,11}$)/,"55")}?text=${encodeURIComponent(`Olá, sou de ${city}/${state} e gostaria de falar com ${rep.full_name}.`)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 font-bold"><MessageCircle size={18}/> Solicitar atendimento</a>
      </article>)}
      {!matches.length && !isNetinhoLocal && <a className="inline-flex rounded-lg bg-green-700 px-4 py-3 font-bold text-white" href={`https://wa.me/5515992458492?text=${encodeURIComponent(`Olá! Preciso de representante para ${city}/${state}.`)}`} target="_blank" rel="noreferrer">Solicitar indicação à Netinho</a>}
    </div>}
    {access?.level === 1 && <Link to="/admin-gestao" hash="representantes" className="inline-flex rounded-lg border border-amber-400 px-4 py-3 text-sm font-bold text-[#102a52]">Administrar representantes e regiões</Link>}
  </section>;
}
