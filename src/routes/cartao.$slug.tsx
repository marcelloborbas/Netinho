import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ImageOff } from "lucide-react";

const cards: Record<string,string> = {
 "abdnego-eugenio":"cartao-abdnego-eugenio.webp",
 "domingos-rodrigues":"cartao-domingos-rodrigues.webp",
 "jhonatas-jose":"cartao-jhonatas-jose.webp",
 "jose-justino":"cartao-jose-justino.webp",
 "livaldo-silva":"cartao-livaldo-silva.webp",
 "luciano-da-silva":"cartao-luciano-da-silva.webp",
 "marcello-borba":"cartao-marcello-borba.webp",
 "osmair-zanetti":"cartao-osmair-zanetti.webp",
 "romullo-sousa":"cartao-romullo-sousa.webp",
 "jose-burgato":"jose-burgato.webp",
};
const slugify=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export const Route=createFileRoute("/cartao/$slug")({component:PublicCard});
function PublicCard(){
 const {slug}=Route.useParams();
 const [failed,setFailed]=useState(false);
 const {data:rep,isPending}=useQuery({queryKey:["public-card-rep",slug],queryFn:async()=>{
  const {data,error}=await supabase.rpc("list_public_representatives" as never);
  if(error)throw error;
  return ((data??[]) as Array<{id:string;full_name:string;region:string}>).find(p=>slugify(p.full_name)===slug)||null;
 }});
 const image=cards[slug];
 return <main className="min-h-screen bg-[#f1f1f1] px-3 py-6 text-[#102a52]">
  <section className="mx-auto max-w-lg overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-white shadow-lg">
   <header className="bg-[#102a52] px-4 py-4 text-center text-[#ffe19a]"><h1 className="text-xl font-black">Netinho Auto Parts</h1><p className="text-sm">Cartão digital do representante</p></header>
   {isPending?<p className="p-8 text-center">Carregando cartão…</p>:!rep||!image||failed?<div className="flex flex-col items-center gap-3 p-8 text-center"><ImageOff/><p>Cartão indisponível. Consulte a Netinho Auto Parts.</p></div>:<div className="space-y-3 p-3"><img src={`/cartoes-digitais/${encodeURIComponent(image)}`} alt={`Cartão de visita de ${rep.full_name}`} className="h-auto w-full rounded-lg object-contain" onError={()=>setFailed(true)}/><h2 className="text-center text-lg font-black">{rep.full_name}</h2><p className="text-center text-sm">{rep.region}</p></div>}
  </section>
 </main>;
}
