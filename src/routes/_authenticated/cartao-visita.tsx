import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, Download, Contact, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { accessQuery } from "@/lib/access";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/cartao-visita")({
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
    if(!userId)return;
    let active=true;
    const stored=supabase.storage.from("person-photos").getPublicUrl(userId+"/cartao.webp").data.publicUrl;
    try { const response=await fetch(stored,{method:"HEAD",cache:"no-store"}); if(response.ok && (response.headers.get("content-type")??"").startsWith("image/")) {if(active){setImage(stored);setLoading(false);}return;} } catch { /* tenta cartão publicado */ }
    const extensions=["webp","png","jpg","jpeg"];
    void (async()=>{
      for(const ext of extensions){
        const url="/images/cartoes-visita/"+encodeURIComponent(userId)+"."+ext;
        try{const response=await fetch(url,{method:"HEAD"});if(response.ok && (response.headers.get("content-type")??"").startsWith("image/")){if(active){setImage(url);setLoading(false);}return;}}catch{/* tenta a próxima extensão */}
      }
      if(active){setImage("");setLoading(false);}
    })();
    return()=>{active=false;};
  },[userId]);
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
  return <main className="mx-auto w-full max-w-xl space-y-4 pb-24 text-[#102a52]">
    <header className="rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-5 py-6 text-center text-white"><h1 className="text-2xl font-black">CARTÃO DE VISITA</h1></header>
    {!isSales?<div className="rounded-xl border bg-white p-5 text-center text-sm">O cartão de visita está disponível para vendedores e representantes.</div>:loading?<p className="p-5 text-center">Carregando cartão…</p>:image?<section className="space-y-4 rounded-2xl border-2 border-[#d4af37] bg-white p-3 shadow-lg">
      <img src={image} alt="Cartão de visita profissional do usuário" className="h-auto w-full rounded-xl object-contain"/>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={()=>void share()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#102a52] px-2 text-sm font-bold text-white"><Share2 size={19}/> Compartilhar</button>
        <button type="button" onClick={()=>void download()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#102a52] px-2 text-sm font-bold"><Download size={19}/> Baixar imagem</button>
      </div>
    </section>:<section className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#d4af37] bg-white p-6 text-center"><ImageOff size={40}/><h2 className="text-lg font-black">Cartão ainda não cadastrado</h2><p className="text-sm">A imagem do cartão deve ser adicionada ao repositório na pasta <code>public/images/cartoes-visita/</code>, com o ID da conta como nome do arquivo e extensão .webp, .png ou .jpg.</p><Contact size={24} className="text-[#d4af37]"/></section>}
  </main>;
}
