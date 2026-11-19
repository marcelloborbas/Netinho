import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Region = { city: string; uf: string };
type Weather = { label: string; temperature: number; code: number };

const stateNames: Record<string, string> = {
 AC:"Acre", AL:"Alagoas", AP:"Amapá", AM:"Amazonas", BA:"Bahia",
 CE:"Ceará", DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás",
 MA:"Maranhão", MT:"Mato Grosso", MS:"Mato Grosso do Sul", MG:"Minas Gerais",
 PA:"Pará", PB:"Paraíba", PR:"Paraná", PE:"Pernambuco", PI:"Piauí",
 RJ:"Rio de Janeiro", RN:"Rio Grande do Norte", RS:"Rio Grande do Sul",
 RO:"Rondônia", RR:"Roraima", SC:"Santa Catarina", SP:"São Paulo",
 SE:"Sergipe", TO:"Tocantins",
};

function condition(code: number) {
 if (code === 0) return "Ensolarado";
 if (code <= 3) return "Parcialmente nublado";
 if (code <= 48) return "Neblina";
 if (code <= 67 || (code >= 80 && code <= 82)) return "Chuva";
 if (code <= 77 || (code >= 85 && code <= 86)) return "Neve";
 if (code >= 95) return "Trovoadas";
 return "Nublado";
}

async function readRegion(): Promise<Region | null> {
 const { data: auth } = await supabase.auth.getUser();
 if (!auth.user) return null;
 const { data, error } = await supabase.from("profiles")
   .select("territory_cities,territory_uf").eq("id",auth.user.id).maybeSingle();
 if (error) throw error;
 const uf = (data?.territory_uf ?? "").trim().toUpperCase();
 let firstCity = (data?.territory_cities ?? "").split(/[,;\n]/)[0]?.trim() ?? "";
 if (auth.user.email) {
   const { data: rep } = await supabase.from("representative_profiles").select("slug").eq("email",auth.user.email.toLowerCase()).maybeSingle();
   if (rep?.slug) {
     const { data: details } = await supabase.from("representative_private_details").select("city").eq("slug",rep.slug).maybeSingle();
     if (details?.city?.trim()) firstCity = details.city.trim();
   }
 }
 if (!firstCity && !stateNames[uf]) return null;
 return { city:firstCity, uf };
}

async function readWeather(region: Region): Promise<Weather | null> {
 const state = stateNames[region.uf] ?? "";
 const place = region.city || state;
 if (!place) return null;
 const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
 geoUrl.searchParams.set("name",place);
 geoUrl.searchParams.set("count","10");
 geoUrl.searchParams.set("language","pt");
 geoUrl.searchParams.set("format","json");
 const geoResponse = await fetch(geoUrl);
 if (!geoResponse.ok) throw new Error("Geocodificação indisponível");
 const geo = await geoResponse.json() as {results?: Array<{latitude:number;longitude:number;name:string;admin1?:string;country_code?:string}>};
 const found = geo.results?.find((item) => item.country_code === "BR" && (!state || item.admin1?.toLocaleLowerCase("pt-BR") === state.toLocaleLowerCase("pt-BR")));
 if (!found) return null;
 const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
 weatherUrl.searchParams.set("latitude",String(found.latitude));
 weatherUrl.searchParams.set("longitude",String(found.longitude));
 weatherUrl.searchParams.set("current","temperature_2m,weather_code");
 weatherUrl.searchParams.set("timezone","auto");
 const weatherResponse = await fetch(weatherUrl);
 if (!weatherResponse.ok) throw new Error("Previsão indisponível");
 const weather = await weatherResponse.json() as {current?: {temperature_2m?:number;weather_code?:number}};
 if (typeof weather.current?.temperature_2m !== "number" || typeof weather.current.weather_code !== "number") return null;
 return {label:region.city ? region.city : state,temperature:weather.current.temperature_2m,code:weather.current.weather_code};
}

export function HomeLocalWeather({enabled}:{enabled:boolean}) {
 const {data:region} = useQuery({queryKey:["home-weather-user-region"],queryFn:readRegion,enabled,staleTime:10*60_000});
 const {data:weather} = useQuery({queryKey:["home-weather-current",region?.city,region?.uf],queryFn:()=>readWeather(region!),enabled:enabled && !!region,staleTime:15*60_000,retry:1});
 if (!weather) return <span className="inline-flex shrink-0 whitespace-nowrap text-gold" title="Confira sua cidade e UF cadastradas">🌤️ Clima indisponível ·</span>;
 return <span title={`Clima atual na região cadastrada: ${weather.label} — ${condition(weather.code)}`} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-gold">
   <span aria-hidden="true">{weather.code <= 3 ? "☀️" : weather.code >= 95 ? "⛈️" : "🌤️"}</span>
   <span>{Math.round(weather.temperature)}°C</span>
   <span className="hidden sm:inline">{condition(weather.code)}</span>
   <span aria-hidden="true">·</span>
 </span>;
}
