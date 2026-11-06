import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const normalizeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const publishedCards: Record<string, string> = {
  "abdnego eugenio": "cartao-abdnego-eugenio.webp",
  "abdenego eugenio": "cartao-abdnego-eugenio.webp",
  "domingos rodrigues": "cartao-domingos-rodrigues.webp",
  "jhonatas jose": "cartao-jhonatas-jose.webp",
  "jose justino": "cartao-jose-justino.webp",
  "livaldo silva": "cartao-livaldo-silva.webp",
  "livaldo de souza silva": "cartao-livaldo-silva.webp",
  "luciano da silva": "cartao-luciano-da-silva.webp",
  "marcello borba": "cartao-marcello-borba.webp",
  "marcello borba sampaio": "cartao-marcello-borba.webp",
  "osmair zanetti": "cartao-osmair-zanetti.webp",
  "romullo sousa": "cartao-romullo-sousa.webp",
  "jose burgato": "jose-burgato.webp",
};
import { Share2, Download, Contact, ImageOff, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { accessQuery } from "@/lib/access";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/cartao-visita")({
  staticData: { sitemap: false },
  head: () => pageHead("/cartao-visita", "Cartão de visita | Netinho Auto Parts", "Consulte e compartilhe seu cartão de visita profissional."),
  component: BusinessCardPage,
});

function BusinessCardPage() {
  const {data:access}=useQuery(accessQuery);
  const [userId,setUserId]=useState("");
  const [image,setImage]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data})=>{if(active)setUserId(data.user?.id??"");});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(!userId || !access)return;
    let active=true;
    const stored=supabase.storage.from("person-photos").getPublicUrl(userId+"/cartao.webp").data.publicUrl;
    const matchedName = normalizeName(access.name ?? "");
    const publishedFile = publishedCards[matchedName];
    const extensions=["webp","png","jpg","jpeg"];
    void (async()=>{
  try { const response=await fetch(stored,{method:"HEAD",cache:"no-store"}); if(response.ok && (response.headers.get("content-type")??"").startsWith("image/")) {if(active){setImage(stored);setLoading(false);}return;} } catch { /* tenta cartão publicado */ }
      if (publishedFile) {
        const url = "/cartoes-digitais/" + encodeURIComponent(publishedFile);
        try { const response = await fetch(url, {method:"HEAD",cache:"no-store"}); if(response.ok && (response.headers.get("content-type")??"").startsWith("image/")) { if(active){setImage(url);setLoading(false);}return; } } catch { /* tenta alternativas */ }
      }
      for(const ext of extensions){
        const url="/images/cartoes-visita/"+encodeURIComponent(userId)+"."+ext;
        try{const response=await fetch(url,{method:"HEAD"});if(response.ok && (response.headers.get("content-type")??"").startsWith("image/")){if(active){setImage(url);setLoading(false);}return;}}catch{/* tenta a próxima extensão */}
      }
      if(active){setImage("");setLoading(false);}
    })();
    return()=>{active=false;};
  },[userId,access?.name]);
  const isSales=access?.attribution==="Representante"||access?.attribution==="Vendedor"||access?.can_sell===true;
  const getCardFile=async()=>{
    const response=await fetch(image);
    if(!response.ok)throw new Error("Imagem do cartão indisponível.");
    const blob=await response.blob();
    const ext=blob.type==="image/png"?"png":blob.type==="image/jpeg"?"jpg":"webp";
    return new File([blob],"cartao-netinho."+ext,{type:blob.type||"image/webp"});
  };
  const download=async()=>{
    if(!image)return;
    try{
      const file=await getCardFile();
      const url=URL.createObjectURL(file);
      const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    }catch{toast.error("Não foi possível baixar a imagem.");}
  };
  const share=async()=>{
    if(!image)return;
    try{
      const file=await getCardFile();
      if(navigator.canShare?.({files:[file]})&&navigator.share){
        await navigator.share({files:[file],title:"Meu cartão de visita - Netinho Auto Parts"});
      }else if(navigator.share){
        await navigator.share({title:"Meu cartão de visita - Netinho Auto Parts",url:new URL(image,window.location.origin).href});
      }else{
        await download();toast.info("Imagem baixada. Abra o WhatsApp e publique em Atualizações → Meu status.");
      }
    }catch(e){if((e as Error).name!=="AbortError")toast.error("Não foi possível compartilhar o cartão.");}
  };
  return <main className="mx-auto w-full max-w-none space-y-2 pb-24 text-[#102a52]">
    {!isSales?<div className="rounded-xl border bg-white p-5 text-center text-sm">O cartão de visita está disponível para vendedores e representantes.</div>:loading?<p className="p-5 text-center">Carregando cartão…</p>:image?<section className="relative mx-auto w-full max-w-4xl">
      <img src={image} alt="Cartão de visita profissional do usuário" className="block h-auto w-full object-contain" />
      <button type="button" onClick={()=>void share()} aria-label="Compartilhar cartão de visita" title="Compartilhar" className="absolute bottom-3 left-3 z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#123e74]/95 text-white shadow-lg transition hover:scale-105"><Share2 size={25}/></button>
      <button type="button" onClick={()=>void download()} aria-label="Baixar cartão de visita" title="Baixar" className="absolute bottom-3 right-3 z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#fff8e6]/95 text-[#102a52] shadow-lg transition hover:scale-105"><Download size={25}/></button>
    </section>:<section className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#d4af37] bg-white p-6 text-center"><ImageOff size={40}/><h2 className="text-lg font-black">Cartão ainda não cadastrado</h2><p className="text-sm">O cartão deve estar publicado na pasta <code>public/cartoes-digitais/</code> e associado ao nome cadastrado na sua ficha. Caso já tenha sido enviado, solicite a vinculação do seu cartão ao administrador.</p><Contact size={24} className="text-[#d4af37]"/></section>}
  </main>;
}
