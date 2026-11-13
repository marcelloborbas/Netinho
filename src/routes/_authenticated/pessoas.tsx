import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Trash2, Pencil, X, UserPlus, ArrowLeft, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/pessoas")({
  staticData: { sitemap: false },
  component: Pessoas,
  head: () => ({ meta: [{ title: "Pessoal | Netinho" }, { name: "description", content: "Administração de pessoas e acessos da Netinho Auto Parts." }, { property: "og:title", content: "Pessoal | Netinho" }, { property: "og:description", content: "Administração de pessoas e acessos da Netinho Auto Parts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});
type Role = "Visitante" | "Vendedor" | "Representante" | "Administrador";
type Person = { id:string; full_name:string; email:string; site_role:Role; access_active:boolean; territory_uf:string|null; territory_cities:string|null; supervisor_id:string|null; phone:string|null };
const roles:Role[] = ["Visitante","Vendedor","Representante","Administrador"];
function Pessoas() {
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const qc=useQueryClient();
 const location = useLocation();
 const [adding,setAdding]=useState(()=>location.hash==="#novo-representante");
 const [filterRole,setFilterRole]=useState<Role | "Todos">(() => location.hash === "#representantes" ? "Representante" : "Todos");
 const [commissionFilter,setCommissionFilter]=useState("Todas");
 const [editing,setEditing]=useState<string|null>(()=>{const match=location.hash.match(/^#(person|representative):([0-9a-f-]{36})$/i);return match?match[1]+":"+match[2]:null;});
 const [newName,setNewName]=useState("");
 const [newEmail,setNewEmail]=useState("");
 const [creating,setCreating]=useState(false);
 async function addPerson(){
  if(!newName.trim()||!/^\S+@\S+\.\S+$/.test(newEmail.trim())){toast.error("Informe nome e e-mail válidos.");return;}
  setCreating(true);
  const {error}=await supabase.from("commercial_representatives").insert({full_name:newName.trim(),email:newEmail.trim().toLowerCase(),active:true});
  setCreating(false);
  if(error){toast.error("Não foi possível adicionar: "+error.message);return;}
  toast.success("Pessoa adicionada ao cadastro comercial. Para acessar o site, será necessário vincular uma conta de usuário.");
  setAdding(false);setNewName("");setNewEmail("");
  void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});
 }

 const {data:representatives=[],isLoading:loadingRepresentatives,error:representativesError}=useQuery({queryKey:["admin-commercial-representatives"],enabled:!!me?.isAdmin,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representatives").select("id,full_name,email,active").order("full_name");if(error)throw error;return data??[];}});
 const {data:people=[],isLoading,error}=useQuery({queryKey:["admin-people"],enabled:!!me?.isAdmin,queryFn:async()=>{
  const {data,error}=await supabase.from("profiles").select("id,full_name,email,site_role,access_active,territory_uf,territory_cities,supervisor_id,phone").order("full_name");
  if(error)throw error;return (data??[]) as Person[];
 }});
 const {data:commissionRows=[],error:ratesError}=useQuery({queryKey:["admin-all-person-commissions"],enabled:!!me?.isAdmin,queryFn:async()=>{const {data,error}=await supabase.from("salesperson_commission_rates" as never).select("user_id,rate");if(error)throw error;return (data??[]) as {user_id:string;rate:number}[];}});
 const {data:commercialRates=[],error:commercialRatesError}=useQuery({queryKey:["admin-all-commercial-commissions"],enabled:!!me?.isAdmin,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representative_commission_rates" as never).select("representative_id,rate");if(error)throw error;return (data??[]) as {representative_id:string;rate:number}[];}});
 const {data:monthTotals={},error:monthTotalsError,isLoading:monthTotalsLoading}=useQuery({
  queryKey:["admin-monthly-seller-totals",new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"}).slice(0,7)],
  enabled:!!me?.isAdmin,
  queryFn:async()=>{
   const today=new Date();
   const dateParts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(today);
   const y=Number(dateParts.find(p=>p.type==="year")?.value);
   const m=Number(dateParts.find(p=>p.type==="month")?.value);
   const target=y+"-"+String(m).padStart(2,"0");
   const begin=new Date(Date.UTC(y,m-1,1)-86400000).toISOString();
   const finish=new Date(Date.UTC(y,m,1)+86400000).toISOString();
   const totals:Record<string,number>={};
   for(let offset=0;;offset+=500){
    const result=await supabase.from("orders").select("seller_id,created_at,total,kind,status").gte("created_at",begin).lt("created_at",finish).order("created_at").range(offset,offset+499);
    if(result.error)throw result.error;
    for(const order of result.data??[]){
     if(!order.seller_id||order.kind==="orcamento"||order.status==="cancelled")continue;
     const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(new Date(order.created_at));
     if(parts.find(p=>p.type==="year")?.value+"-"+parts.find(p=>p.type==="month")?.value!==target)continue;
     totals[order.seller_id]=(totals[order.seller_id]??0)+Number(order.total??0);
    }
    if((result.data??[]).length<500)break;
   }
   return totals;
  }
 });
 const monthlySalesFor=(id:string)=>monthTotalsLoading?"Calculando…":monthTotalsError?"Indisponível":(monthTotals[id]??0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 const rateForPerson=(id:string)=>commissionRows.find(x=>x.user_id===id)?.rate;
 const rateForRepresentative=(id:string)=>commercialRates.find(x=>x.representative_id===id)?.rate;
 const matchesRate=(rate:number|undefined)=>commissionFilter==="Todas"||(commissionFilter==="Definida"?rate!=null:commissionFilter==="Não definida"?rate==null:rate!=null&&Number(rate)===Number(commissionFilter));
 if(loadingMe)return <p className="p-5">Carregando…</p>;
 if(!me?.isAdmin)return <p className="p-5">Acesso restrito ao administrador.</p>;
 const selectedPerson=people.find(p=>editing===`person:${p.id}`);
 const selectedRepresentative=representatives.find(p=>editing===`representative:${p.id}`);
 const refresh=()=>{void qc.invalidateQueries({queryKey:["admin-people"]});void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["access"]});};
 if(editing&&(selectedPerson||selectedRepresentative))return <main className="mx-auto min-h-[calc(100dvh-140px)] w-full max-w-3xl space-y-4 bg-[#f1f1f1] px-3 py-4 text-[#102a52]">
      <AdminPageNavigation/>
  <button type="button" onClick={()=>setEditing(null)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold"><ArrowLeft size={19}/>Voltar para PESSOAL</button>
  
  {selectedPerson?<PersonCard key={selectedPerson.id} person={selectedPerson} people={people} monthlySales={monthlySalesFor(selectedPerson.id)} editingPage onClose={()=>setEditing(null)} onSaved={refresh}/>:selectedRepresentative?<RepresentativeCard key={selectedRepresentative.id} representative={selectedRepresentative} monthlySales="Sem vínculo com pedidos" editingPage onClose={()=>setEditing(null)} onSaved={refresh}/>:null}
 </main>;

 return <main className="mx-auto max-w-4xl space-y-4 px-3 py-5 text-[#102a52]">
  
  {adding&&<div role="dialog" aria-modal="true" aria-label="Adicionar nova pessoa" className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-3"><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 text-[#102a52] shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Adicionar pessoa</h2><button type="button" aria-label="Fechar" onClick={()=>setAdding(false)}><X size={22}/></button></div><p className="text-sm text-slate-600">Este formulário cria apenas um contato comercial, sem login nem permissões. Para atribuir Visitante, Vendedor, Representante ou Administrador, edite uma conta já cadastrada na lista de usuários.</p><label className="block text-sm font-bold">Nome completo<input value={newName} onChange={e=>setNewName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-3"/></label><label className="block text-sm font-bold">E-mail<input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-3"/></label><button type="button" disabled={creating} onClick={()=>void addPerson()} className="min-h-12 w-full rounded-lg bg-[#102a52] px-4 font-bold text-white disabled:opacity-50">{creating?"Adicionando…":"Adicionar pessoa"}</button></div></div>}
  
  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
   <div className="flex items-center justify-between gap-3"><h1 className="text-xl font-black">Pessoas e Comissões</h1><button type="button" onClick={()=>setAdding(true)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 border-[#d4af37] bg-[#102a52] px-3 text-sm font-bold text-white"><UserPlus size={18}/>Adicionar</button></div>
   <div className="text-sm font-bold">Perfil e comissão</div>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    <label className="text-xs font-bold">Perfil<select aria-label="Filtrar por perfil" value={filterRole} onChange={e=>setFilterRole(e.target.value as Role|"Todos")} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"><option value="Todos">Todos</option>{roles.map(role=><option key={role} value={role}>{role}</option>)}</select></label>
    <label className="text-xs font-bold">Comissão<select aria-label="Filtrar por comissão" value={commissionFilter} onChange={e=>setCommissionFilter(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"><option>Todas</option><option>Definida</option><option>Não definida</option>{[0.5,1,1.5,2,2.5,3,3.5].map(n=><option key={n} value={n}>{n.toLocaleString("pt-BR")}%</option>)}</select></label>

   </div>
   
   {(ratesError||commercialRatesError)&&<p role="alert" className="text-xs font-semibold text-red-700">Não foi possível consultar todas as comissões. O filtro por comissão pode estar incompleto.</p>}
  </div>
  {isLoading&&<p>Carregando pessoas…</p>}{error&&<p role="alert" className="text-red-700">Não foi possível carregar os cadastros. A atualização do banco de dados pode estar pendente.</p>}
  {[...people.filter(p=>(filterRole==="Todos"||p.site_role===filterRole)&&matchesRate(rateForPerson(p.id))).map(p=>({kind:"person" as const,id:p.id,name:p.full_name||"Sem nome",record:p})),...representatives.filter(rep=>(filterRole==="Todos"||filterRole==="Representante")&&matchesRate(rateForRepresentative(rep.id))&&!people.some(p=>p.email?.trim().toLowerCase()===rep.email?.trim().toLowerCase())).map(rep=>({kind:"representative" as const,id:rep.id,name:rep.full_name||"Sem nome",record:rep}))].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(entry=>entry.kind==="person"
   ? <PersonCard key={`person-${entry.id}`} person={entry.record} people={people} monthlySales={monthlySalesFor(entry.id)} onEdit={()=>setEditing(`person:${entry.id}`)} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-people"]});void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["access"]});void qc.invalidateQueries({queryKey:["admin-all-person-commissions"]});}}/>
   : <RepresentativeCard key={`representative-${entry.id}`} representative={entry.record} monthlySales="Sem vínculo com pedidos" onEdit={()=>setEditing(`representative:${entry.id}`)} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["admin-all-commercial-commissions"]});}}/>)}
  {loadingRepresentatives&&<p>Carregando representantes…</p>}
  {representativesError&&<p role="alert" className="text-red-700">Não foi possível carregar os representantes comerciais.</p>}
  {!isLoading&&!error&&people.length===0&&representatives.length===0&&<p className="rounded-xl bg-white p-4">Nenhuma pessoa cadastrada.</p>}
 </main>;
}
function PersonPhoto({id,name}:{id:string;name:string}) {
 const [photo,setPhoto]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const path=id+"/foto.webp";
 const url=supabase.storage.from("person-photos").getPublicUrl(path).data.publicUrl;
 useEffect(()=>{let alive=true;fetch(url,{method:"HEAD"}).then(r=>{if(alive&&r.ok)setPhoto(url+"?v="+Date.now());}).catch(()=>{});return()=>{alive=false;};},[url]);
 async function choose(file:File|undefined){
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast.error("Escolha uma foto JPG, PNG ou WebP.");return;}
  if(file.size>5*1024*1024){toast.error("A foto deve ter até 5 MB.");return;}
  setBusy(true);
  try{
   const bitmap=await createImageBitmap(file);
   const canvas=document.createElement("canvas");
   const scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível processar a foto.");
   ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Falha ao preparar imagem.")),"image/webp",0.85));
   const {error}=await supabase.storage.from("person-photos").upload(path,blob,{upsert:true,contentType:"image/webp",cacheControl:"60"});
   if(error)throw error;
   setPhoto(url+"?v="+Date.now());toast.success("Foto atualizada.");
  }catch(e){toast.error("Não foi possível salvar a foto: "+(e instanceof Error?e.message:String(e)));}
  finally{setBusy(false);}
 }
 return <label title="Escolher foto" className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-[#d4af37] bg-slate-100 text-[#102a52]">
  {photo?<img src={photo} alt={`Foto de ${name}`} className="h-full w-full object-cover"/>:<UserRound size={33}/>}
  <span className="absolute bottom-0 left-0 right-0 bg-[#102a52]/90 py-0.5 text-center text-[9px] font-bold text-white">{busy?"Enviando…":"Foto +"}</span>
  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} aria-label={`Selecionar foto de ${name}`} className="sr-only" onChange={e=>{void choose(e.target.files?.[0]);e.target.value="";}}/>
 </label>;
}
function PersonCard({person,people,monthlySales,onSaved,onEdit,editingPage=false,onClose}:{person:Person;people:Person[];monthlySales:string;onSaved:()=>void;onEdit?:()=>void;editingPage?:boolean;onClose?:()=>void}) {
 const {data:me}=useQuery(meQuery);
 const qc=useQueryClient();
 const ownAccount=me?.id===person.id;
 const [name,setName]=useState(person.full_name??"");
 const [phone,setPhone]=useState(person.phone??"");
 const [role,setRole]=useState<Role>(person.site_role);
 const [active,setActive]=useState(person.access_active);
 const [uf,setUf]=useState(person.territory_uf??"");
 const [cities,setCities]=useState(person.territory_cities??"");
 const [cityBase,setCityBase]=useState("");
 const [region,setRegion]=useState("");
 const [areaDdds,setAreaDdds]=useState("");
 const [mapUrl,setMapUrl]=useState("");
 const [mapFile,setMapFile]=useState<File|null>(null);
 const territoryInitialized=useRef(false);
 const territoryEdited=useRef(false);
 const [supervisor,setSupervisor]=useState(person.supervisor_id??"");
 const [busy,setBusy]=useState(false);
 const [commissionRate,setCommissionRate]=useState("");
 const [open,setOpen]=useState(editingPage);

 const sales=role==="Vendedor"||role==="Representante"||role==="Administrador";
 const {data:commissionData,isError:commissionError}=useQuery({queryKey:["person-commission",person.id],enabled:true,queryFn:async()=>{const {data,error}=await supabase.from("salesperson_commission_rates" as never).select("rate").eq("user_id",person.id).maybeSingle();if(error)throw error;const rate=(data as {rate:number}|null)?.rate;return rate ?? null;}});
 const commissionInitialized=useRef(false);
 useEffect(()=>{if(!commissionInitialized.current&&commissionData!==undefined){setCommissionRate(commissionData == null ? (person.site_role==="Administrador"?"3.5":"") : String(commissionData));commissionInitialized.current=true;}},[commissionData,person.site_role]);
 const {data:territory}=useQuery({queryKey:["person-territory",person.id],enabled:open||editingPage,queryFn:async()=>{
  const {data,error}=await supabase.from("person_territories" as never).select("city_base,region,map_url").eq("user_id",person.id).maybeSingle();
  if(error)throw error;
  const value=data as {city_base:string;region:string;map_url:string}|null;
  return value;
 }});
 useEffect(()=>{if(!territoryInitialized.current&&!territoryEdited.current&&territory!==undefined){setCityBase(territory?.city_base??"");setRegion(territory?.region??"");setMapUrl(territory?.map_url??"");territoryInitialized.current=true;}},[territory]);
 const {data:storedDdds}=useQuery({queryKey:["representative-area-ddds",person.id],enabled:role==="Representante",queryFn:async()=>{const {data,error}=await supabase.from("representative_area_ddds" as never).select("ddds").eq("representative_id",person.id).maybeSingle();if(error)throw error;return (data as {ddds?:string}|null)?.ddds??"";}});
 const dddsInitialized=useRef(false);
 useEffect(()=>{if(!dddsInitialized.current&&storedDdds!==undefined){setAreaDdds(storedDdds);dddsInitialized.current=true;}},[storedDdds]);
 const effectiveCity=cityBase;
 const effectiveRegion=region;
 const effectiveMap=mapUrl;

 async function save(){
  if(!name.trim()){toast.error("Informe o nome da pessoa.");return;}
  if(sales&&!territoryInitialized.current&&!territoryEdited.current){toast.error("Aguarde o carregamento dos dados regionais antes de salvar.");return;}
  setBusy(true);
  const {error}=await supabase.rpc("admin_set_person" as never,{p_user:person.id,p_role:role,p_active:active,p_uf:uf,p_cities:cities,p_supervisor:supervisor||null} as never);
  if(error){setBusy(false);toast.error("Não foi possível salvar permissões: "+error.message);return;}
  const {error:profileError}=await supabase.rpc("admin_update_person_contact" as never,{p_user:person.id,p_name:name.trim(),p_phone:phone.trim()} as never);
  if(profileError){setBusy(false);toast.error("Permissões salvas, mas nome/telefone não foram confirmados: "+(profileError?.message??"O banco não autorizou a alteração. Verifique as permissões da tabela profiles."));onSaved();return;}
  let image=effectiveMap.trim();
  if(mapFile){
   const extension=mapFile.name.split(".").pop()?.toLowerCase()||"webp";
   const path=person.id+"/mapa-"+Date.now()+"."+extension;
   const uploaded=await supabase.storage.from("territory-maps").upload(path,mapFile,{contentType:mapFile.type});
   if(uploaded.error){setBusy(false);toast.error("Erro ao enviar mapa: "+uploaded.error.message);return;}
   image=supabase.storage.from("territory-maps").getPublicUrl(path).data.publicUrl;
  }
  const {data:savedTerritory,error:territoryError}=await supabase.from("person_territories" as never).upsert({user_id:person.id,city_base:effectiveCity.trim(),region:effectiveRegion.trim(),map_url:image} as never,{onConflict:"user_id"}).select("user_id").maybeSingle();
  setBusy(false);
  if(territoryError||!savedTerritory){toast.error("Dados da pessoa salvos, mas região/mapa não foram confirmados: "+(territoryError?.message??"O banco não confirmou a gravação."));onSaved();return;}
  if(role==="Representante"){
   const ddds=Array.from(new Set(areaDdds.split(/[,;\\s]+/).map(x=>x.replace(/^0+(?=\\d)/,"")).filter(Boolean)));
   if(ddds.some(x=>!/^\\d{2}$/.test(x))){toast.error("Informe DDDs de dois dígitos, separados por vírgula.");return;}
   const {error:dddError}=await supabase.from("representative_area_ddds" as never).upsert({representative_id:person.id,ddds:ddds.join(", ")} as never,{onConflict:"representative_id"});
   if(dddError){toast.error("Dados pessoais salvos, mas os DDDs não foram gravados: "+dddError.message);return;}
   void qc.invalidateQueries({queryKey:["representative-area-ddds",person.id]});
  }
  setMapUrl(image);setMapFile(null);territoryEdited.current=false;
  await qc.invalidateQueries({queryKey:["person-territory",person.id]});
  // Comissões são independentes: falhas não impedem o salvamento do território.
  const parsed=role==="Administrador" ? 3.5 : commissionRate === "" ? null : Number(commissionRate);
  const originalRate=commissionData??null;
  const commissionChanged=sales && commissionData!==undefined && !commissionError && parsed!==originalRate;
  let commissionWarning="";
  if(commissionChanged){
   if(parsed!==null&&(!Number.isFinite(parsed)||parsed<0.5||parsed>3.5||!Number.isInteger(parsed*2))){
    commissionWarning="A comissão informada é inválida (permitido: 0,5% a 3,5%).";
   }else{
    const {error:rateError}=await supabase.rpc("admin_set_salesperson_commission" as never,{p_user:person.id,p_rate:parsed} as never);
    if(rateError)commissionWarning="A comissão não foi atualizada: "+rateError.message;
    else void qc.invalidateQueries({queryKey:["person-commission",person.id]});
   }
  }
  if(commissionWarning)toast.warning("Pessoa e região salvas. "+commissionWarning);
  else toast.success("Pessoa e região atualizadas.");
  onSaved();setOpen(false);onClose?.();
 }
 return <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-2"><strong className="break-words text-lg">{person.full_name||"Sem nome"}</strong>{(person.site_role==="Vendedor"||person.site_role==="Representante"||person.site_role==="Administrador")&&<span className="whitespace-nowrap rounded-md bg-amber-50 px-2 py-0.5 text-sm font-black text-[#102a52]">{commissionError?"—":commissionData==null?(person.site_role==="Administrador"?"3,5%":"—"):`${Number(commissionData).toLocaleString("pt-BR")}%`}</span>}</div>
      <div className="text-sm font-semibold text-[#102a52]">{person.site_role}</div>
      <div className="mt-1 text-xs text-slate-600">Vendas do mês: {monthlySales}</div>
    </div>
    <PersonPhoto id={person.id} name={person.full_name||"usuário"}/>
  </div>
  <div className="mt-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>onEdit?.()} aria-label={`Editar ficha de ${person.full_name||person.email}`} title="Editar ficha (somente administrador)" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900"><Pencil size={18}/> Editar ficha</button>
   <span className={`rounded-lg px-3 py-1 text-xs font-bold ${person.access_active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{person.access_active?"Ativo":"Inativo"}</span>
   <Button type="button" variant="outline" size="icon" disabled={busy||ownAccount} onClick={async()=>{
    if(ownAccount||busy)return;
    const identity=person.full_name||person.email;
    if(!window.confirm(`Excluir DEFINITIVAMENTE ${identity}? A conta de login e o cadastro serão apagados. Esta ação não pode ser desfeita.`))return;
    setBusy(true);
    try {
      const {data,error}=await supabase.functions.invoke("delete-person",{body:{userId:person.id}});
      if(error){
        let detail=error.message;
        if("context" in error && error.context instanceof Response){
          const response=error.context;
          try {const payload=await response.clone().json();detail=payload?.message||payload?.error||detail;}catch{detail=detail+" (HTTP "+response.status+")";}
        }
        const network=/failed to send|failed to fetch|network|fetch failed/i.test(detail);
        toast.error(network
          ?"O serviço de exclusão não respondeu. Não foi possível confirmar a exclusão. Atualize PESSOAL antes de tentar novamente."
          :"Não foi possível excluir: "+detail,{duration:9000});
        return;
      }
      if(!data||data.success!==true||data.deletedUserId!==person.id){
        toast.error("Exclusão não confirmada: "+(data?.message||"Resposta inesperada do servidor."),{duration:9000});
        return;
      }
      qc.setQueryData<Person[]>(["admin-people"],current=>current?.filter(p=>p.id!==person.id));
      // Hide linked commercial rows until their server-backed list is refreshed.
      qc.setQueryData<CommercialRepresentative[]>(["admin-commercial-representatives"],current=>current?.filter(p=>p.email.trim().toLowerCase()!==person.email.trim().toLowerCase()));
      toast.success("Usuário excluído permanentemente.");
      onSaved();
      onClose?.();
    } catch(cause){
      toast.error("Falha na comunicação com o serviço de exclusão. Nenhum cadastro foi confirmado como excluído.",{duration:9000});
      console.error("delete-person:",cause);
    } finally {setBusy(false);}
   }} title={ownAccount?"Não é permitido excluir a própria conta administrativa":"Excluir usuário permanentemente"} aria-label={`Excluir definitivamente ${person.full_name||person.email}`} className="border-destructive text-destructive disabled:opacity-40"><Trash2 size={19}/></Button>
  </div>

  {(open||editingPage)&&<div className="w-full"><div className="w-full rounded-2xl bg-white p-4 text-[#102a52] shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-black">Ficha completa da pessoa</h2><button type="button" onClick={()=>{setOpen(false);onClose?.();}} aria-label="Fechar edição" className="rounded-lg p-2"><X size={22}/></button></div><div className="space-y-4">
   <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
    <h3 className="mb-4 text-base font-black">Identificação e acesso</h3>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(130px,1fr)]">
     <label className="block font-bold">Nome completo<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
     <label className="block font-bold">Status / perfil<select value={role} onChange={e=>setRole(e.target.value as Role)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{roles.map(r=><option key={r}>{r}</option>)}</select></label>
     <label className="block font-bold">Situação<select value={active?"ativo":"inativo"} onChange={e=>setActive(e.target.value==="ativo")} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
     <label className="block font-bold">E-mail de acesso<input type="email" value={person.email} readOnly className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-600"/><span className="mt-1 block text-xs font-normal text-slate-500">Vinculado à conta de login.</span></label>
     <label className="block font-bold">Telefone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    </div>
   </section>
   <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#102a52]">Este usuário possui uma conta de acesso. Seus dados de contato e região devem ser editados nos campos da ficha acima. A ficha comercial complementar só pode ser salva para representantes vinculados ao cadastro comercial.</p>
   <div className="rounded-lg bg-[#eaf2ff] p-3 text-sm"><strong>Permissões automáticas:</strong> {role==="Visitante"?"Catálogo e preços à vista, sem pedidos.":role==="Administrador"?"Administração, catálogo completo, preços, estoque e pedidos.":role==="Representante"?"Catálogo completo, preços à vista e a prazo, estoque, pedidos e equipe.":"Catálogo completo, preços à vista e a prazo, estoque e pedidos."}</div>
   <section className="space-y-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
    <h3 className="text-lg font-black">Comissão individual sobre vendas</h3>
    <label className="block text-sm font-bold">Percentual (%)<select value={commissionRate} onChange={e=>setCommissionRate(e.target.value)} disabled={!sales||commissionError} className="mt-2 min-h-12 w-full rounded-lg border-2 border-amber-400 bg-white px-3 text-base disabled:opacity-60"><option value="">Não definida</option>{[0.5,1,1.5,2,2.5,3,3.5].map(rate=><option key={rate} value={rate}>{rate.toLocaleString("pt-BR")}%</option>)}</select></label>
    {!sales&&<p className="text-sm text-amber-900">Selecione o perfil Vendedor ou Representante para habilitar a comissão.</p>}
    {commissionError&&<p role="alert" className="text-sm font-bold text-red-700">Não foi possível consultar a comissão. Não salve até corrigir a conexão com o banco.</p>}
    <p className="text-xs text-slate-600">A comissão é salva junto com a ficha da pessoa.</p>
   </section>
   {sales&&<div className="space-y-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3">
    <strong>Área de atuação</strong>
    <label className="block text-sm font-bold">Cidade-base de atuação<input value={effectiveCity} onChange={e=>{territoryEdited.current=true;setCityBase(e.target.value);}} placeholder="Ex.: Sorocaba" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    {role==="Representante"&&<label className="block text-sm font-bold">DDD(s) da área de atuação<input value={areaDdds} onChange={e=>setAreaDdds(e.target.value)} placeholder="Ex.: 11, 15, 19" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/><span className="text-xs font-normal text-slate-500">Separe múltiplos DDDs por vírgula.</span></label>}
    <label className="block text-sm font-bold">Região de atuação<input value={effectiveRegion} onChange={e=>{territoryEdited.current=true;setRegion(e.target.value);}} placeholder="Ex.: Sorocaba e região, DDD 15" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    <label className="block text-sm font-bold">Estado(s) — UF<input value={uf} onChange={e=>setUf(e.target.value)} placeholder="Ex.: SP, MG" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    <label className="block text-sm font-bold">Cidades atendidas<textarea value={cities} onChange={e=>setCities(e.target.value)} rows={2} placeholder="Ex.: Sorocaba, Itu, Votorantim" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"/></label>
    {role==="Vendedor"&&<label className="block text-sm font-bold">Representante responsável<select value={supervisor} onChange={e=>setSupervisor(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Não vinculado</option>{people.filter(p=>p.id!==person.id&&p.site_role==="Representante").map(p=><option value={p.id} key={p.id}>{p.full_name||p.email}</option>)}</select></label>}
    <div className="space-y-2 rounded-lg border border-blue-200 bg-white p-3">
      <strong className="block text-sm">Mapa de imagem da região de atuação</strong>
      <label className="block text-sm font-bold">Enviar imagem (PNG, JPG ou WebP, até 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0]??null;if(file&&file.size>5*1024*1024){toast.error("Limite de 5 MB.");e.target.value="";return;}setMapFile(file);}} className="mt-1 block w-full text-sm"/></label>
      <label className="block text-sm font-bold">Ou endereço da imagem<input value={effectiveMap} onChange={e=>{setMapUrl(e.target.value);setMapFile(null);}} placeholder="/images/territories/mapa.webp" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"/></label>
      {mapFile?<p className="text-xs">Imagem selecionada: {mapFile.name}</p>:effectiveMap?<img src={effectiveMap} alt="Mapa da região de atuação" className="max-h-96 w-full rounded-xl object-contain"/>:/\\bGO\\b/i.test(uf)?<figure className="overflow-hidden rounded-xl border-2 border-[#d8ac34] bg-white p-1 shadow-md"><img src="/images/territories/mapa-goias.webp" alt="Arte ilustrativa da área de atuação em Goiás, com Goiânia e municípios da região" loading="lazy" className="h-auto w-full object-contain"/><figcaption className="px-2 py-2 text-center text-xs text-slate-600">Referência visual de Goiás. Confirme as cidades atendidas nos campos da ficha.</figcaption></figure>:<p className="text-xs text-slate-600">Sem mapa personalizado.</p>}
    </div>
    {/abdenego|abdnego/i.test(person.full_name+" "+person.email) && <figure className="overflow-hidden rounded-lg border border-blue-200 bg-white p-2"><img src="/images/territories/abdenego.webp" alt="Mapa da área de atuação de Abdenego" className="max-h-80 w-full object-contain"/><figcaption className="mt-1 text-center text-xs">Mapa de atuação cadastrado</figcaption></figure>}
    {/livaldo/i.test(person.full_name+" "+person.email) && <figure className="overflow-hidden rounded-lg border border-blue-200 bg-white p-2"><img src="/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png" alt="Mapa da área de atuação de Livaldo" className="max-h-80 w-full object-contain"/><figcaption className="mt-1 text-center text-xs">Mapa de atuação cadastrado</figcaption></figure>}
    <p className="text-xs text-slate-600">As localidades antigas e os mapas existentes não serão apagados. Estes campos registram a área na ficha da pessoa.</p>
   </div>}
   <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-12 w-full rounded-lg bg-[#102a52] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?"Salvando…":"Salvar ficha e permissões"}</button>
  </div></div></div>}
 </article>;
}

type CommercialRepresentative = {id:string;full_name:string;email:string;active:boolean};
function RepresentativeCard({representative,monthlySales,onSaved,onEdit,editingPage=false,onClose}:{representative:CommercialRepresentative;monthlySales:string;onSaved:()=>void;onEdit?:()=>void;editingPage?:boolean;onClose?:()=>void}) {
 const [open,setOpen]=useState(editingPage);
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState(representative.full_name);
 const [email,setEmail]=useState(representative.email);
 const [active,setActive]=useState(representative.active);
 const qc=useQueryClient();
 const [commissionRate,setCommissionRate]=useState("");
 const {data:commercialCommission,error:commissionError,isLoading:commissionLoading}=useQuery({queryKey:["commercial-representative-commission",representative.id],enabled:true,retry:false,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representative_commission_rates" as never).select("rate").eq("representative_id",representative.id).maybeSingle();if(error)throw error;const rate=(data as {rate:number}|null)?.rate;setCommissionRate(rate==null?"":String(rate));return rate ?? null;}});
 async function save(){
  if(!name.trim()||!/^\S+@\S+\.\S+$/.test(email.trim())){toast.error("Informe nome e e-mail válidos.");return;}
  setBusy(true);
  const {data:savedRepresentative,error}=await supabase.from("commercial_representatives").update({full_name:name.trim(),email:email.trim().toLowerCase(),active}).eq("id",representative.id).select("id").maybeSingle();
  if(error||!savedRepresentative){setBusy(false);toast.error("A ficha não foi atualizada: "+(error?.message??"O banco não autorizou a alteração."));return;}
  const rate=commissionRate===""?null:Number(commissionRate);
  const {error:rateError}=await supabase.rpc("admin_set_commercial_representative_commission" as never,{p_representative:representative.id,p_rate:rate} as never);
  setBusy(false);
  if(rateError){toast.error("Ficha atualizada, mas comissão não salva: "+rateError.message);return;}
  await qc.invalidateQueries({queryKey:["commercial-representative-commission",representative.id]});
  toast.success("Ficha e comissão atualizadas.");onSaved();setOpen(false);onClose?.();
 }
 async function remove(){
  if(!window.confirm(`Excluir DEFINITIVAMENTE o cadastro comercial de ${representative.full_name}? Esta ação não pode ser desfeita.`))return;
  setBusy(true);
  const {data,error}=await supabase.from("commercial_representatives").delete().eq("id",representative.id).select("id");
  setBusy(false);
  if(error){toast.error("Não foi possível excluir: "+error.message);return;}
  if(!data?.length){toast.error("O cadastro não foi excluído. Verifique as permissões do administrador.");return;}
  toast.success("Cadastro comercial excluído.");onSaved();
 }
 return <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-2"><strong className="break-words text-lg">{representative.full_name}</strong><span className="whitespace-nowrap rounded-md bg-amber-50 px-2 py-0.5 text-sm font-black text-[#102a52]">{commissionError?"—":commercialCommission==null?"—":`${Number(commercialCommission).toLocaleString("pt-BR")}%`}</span></div>
      <div className="text-sm font-semibold text-[#102a52]">Representante</div>
      <div className="mt-1 text-xs text-slate-600">Vendas do mês: {monthlySales}</div>
    </div>
    <PersonPhoto id={representative.id} name={representative.full_name}/>
  </div>
  <div className="mt-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>onEdit?.()} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900" aria-label={`Editar ${representative.full_name}`}><Pencil size={18}/>Editar ficha</button>
   <span className={`rounded-lg px-3 py-1 text-xs font-bold ${active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{active?"Ativo":"Inativo"}</span>
   <button type="button" disabled={busy} onClick={()=>void remove()} title="Excluir cadastro comercial" aria-label={`Excluir cadastro comercial de ${representative.full_name}`} className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 disabled:opacity-40"><Trash2 size={19}/></button>
  </div>

  {(open||editingPage)&&<div className="w-full"><div className="w-full rounded-2xl bg-white p-4 text-[#102a52] shadow-sm sm:p-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Ficha do representante comercial</h2><button type="button" onClick={()=>{setOpen(false);onClose?.();}} aria-label="Fechar edição" className="rounded-lg p-2"><X size={22}/></button></div><div className="space-y-3">
   <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="mb-4 text-base font-black text-[#102a52]">Identificação e acesso</h3>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(130px,1fr)]">
     <label className="block text-sm font-bold">Nome completo<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
     <label className="block text-sm font-bold">Status / perfil<select value="Representante" disabled className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700"><option>Representante</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Cadastro comercial; para mudar o perfil, vincule uma conta de acesso.</span></label>
     <label className="block text-sm font-bold">Situação<select value={active?"ativo":"inativo"} onChange={e=>setActive(e.target.value==="ativo")} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
     <label className="block text-sm font-bold">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    </div>
   </section>
   <RepresentativeDetails name={representative.full_name} email={representative.email} representativeId={representative.id} commercial />
   <section className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h4 className="text-base font-black">Comissão individual sobre vendas</h4><label className="mt-3 block text-sm font-bold">Percentual da comissão<select value={commissionRate} onChange={e=>setCommissionRate(e.target.value)} disabled={!!commissionError||commissionLoading} className="mt-2 min-h-12 w-full rounded-lg border border-amber-400 bg-white px-3 text-base disabled:opacity-60"><option value="">Não definida</option>{[0.5,1,1.5,2,2.5,3,3.5].map(rate=><option key={rate} value={rate}>{rate.toLocaleString("pt-BR")}%</option>)}</select></label>{commissionError&&<p role="alert" className="mt-2 text-sm font-bold text-red-700">Não foi possível consultar a comissão: {commissionError.message}.</p>}</section>
   <p className="text-xs text-slate-600">Este é um cadastro comercial ainda não vinculado à ficha de usuário. Sua exclusão não apaga uma conta Google ou outros registros.</p>
   <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-11 w-full rounded-lg bg-[#102a52] px-4 py-2 font-bold text-white disabled:opacity-50">Salvar ficha e comissão</button>
  </div></div></div>}
 </article>;
}

function RepresentativeDetails({name,email,representativeId,commercial=false}:{name:string;email:string;representativeId:string;commercial?:boolean}) {
 const qc=useQueryClient();
 const [values,setValues]=useState<Record<string,string>>({});
 const [initialized,setInitialized]=useState(false);
 const [saving,setSaving]=useState(false);
 const {data:record,isLoading,error}=useQuery({
  queryKey:["admin-representative-detail",name,email],
  queryFn:async()=>{
   const {data:profiles,error:profileError}=await supabase.from("representative_profiles").select("slug,full_name,email,phone,region");
   if(profileError)throw profileError;
   const norm=(v:string|null|undefined)=>(v??"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase();
   const profile=profiles?.find(p=>!!email&&norm(p.email)===norm(email))??profiles?.find(p=>norm(p.full_name)===norm(name));
   if(!profile)return null;
   const {data:details,error:detailsError}=await supabase.from("representative_private_details").select("city,state,service_cities,street_address,neighborhood,postal_code,cpf,rg").eq("slug",profile.slug).maybeSingle();
   if(detailsError)throw detailsError;
   return {profile,details};
  },retry:false
 });
 const fields=[
  {key:"region",label:"Região de atuação"},
  {key:"city",label:"Cidade-base"},
  {key:"state",label:"Estado (UF)"},
  {key:"service_cities",label:"Cidades atendidas"},
  {key:"phone",label:"Telefone / WhatsApp"},
  {key:"street_address",label:"Endereço"},
  {key:"neighborhood",label:"Bairro"},
  {key:"postal_code",label:"CEP"},
  {key:"cpf",label:"CPF"},
  {key:"rg",label:"RG"},
 ] as const;
 useEffect(()=>{if(record&&!initialized){
  const initial:Record<string,string>={};
  for(const field of fields){const source=field.key==="region"||field.key==="phone"?record.profile:record.details;initial[field.key]=String((source as Record<string,unknown>|null)?.[field.key]??"");}
  setValues(initial);setInitialized(true);
 }},[record,initialized]);
 async function saveRegion(){
  if(!record)return;
  setSaving(true);
  try{
   const {data:savedProfile,error:profileError}=await supabase.from("representative_profiles").update({region:values["region"]??"",phone:values["phone"]??""}).eq("slug",record.profile.slug).select("slug").maybeSingle();
   if(profileError)throw profileError;
   const details={city:values["city"]??"",state:values["state"]??"",service_cities:values["service_cities"]??"",street_address:values["street_address"]??"",neighborhood:values["neighborhood"]??"",postal_code:values["postal_code"]??"",cpf:values["cpf"]??"",rg:values["rg"]??""};
   const {data:savedDetails,error:detailError}=await supabase.from("representative_private_details").upsert({slug:record.profile.slug,...details},{onConflict:"slug"}).select("slug").maybeSingle();
   if(detailError)throw detailError;
   if(!savedDetails)throw new Error("O banco não confirmou a atualização dos dados cadastrais.");
   toast.success("Dados regionais e cadastrais atualizados.");
   await qc.invalidateQueries({queryKey:["admin-representative-detail",name,email]});
  }catch(e){toast.error("Não foi possível salvar os dados da ficha: "+(e instanceof Error?e.message:String(e)));}
  finally{setSaving(false);}
 }
 const map=/abdenego|abdnego/i.test(name)?"/images/territories/abdenego.webp":/livaldo/i.test(name)?"/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png":null;
 return <section className="space-y-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3 text-sm">
  <h4 className="font-extrabold">Região e dados cadastrais</h4>
  {isLoading&&<p>Carregando ficha…</p>}
  {error&&<p role="alert" className="text-red-700">Não foi possível consultar a ficha regional.</p>}
  {!isLoading&&!error&&!record&&commercial&&<CommercialDetailsForm representativeId={representativeId} />}
  {!isLoading&&!error&&!record&&!commercial&&<p className="rounded-lg bg-amber-50 p-3 text-sm">Ficha regional não vinculada. Atualize os dados principais na seção Identificação e acesso. Não será criado cadastro comercial duplicado.</p>}
  {record&&initialized&&<>
   {fields.map(field=><label key={field.key} className="block text-sm font-bold">{field.label}<input value={values[field.key]??""} onChange={e=>setValues(v=>({...v,[field.key]:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"/></label>)}
   <button type="button" disabled={saving} onClick={()=>void saveRegion()} className="min-h-11 w-full rounded-lg bg-[#102a52] px-3 font-bold text-white disabled:opacity-50">{saving?"Salvando dados…":"Salvar dados regionais e cadastrais"}</button>
  </>}
  {map&&<a href={map} target="_blank" rel="noreferrer" className="block rounded-lg border border-blue-200 bg-white p-2"><img src={map} alt={`Mapa de atuação de ${name}`} className="max-h-80 w-full object-contain"/><span className="mt-1 block text-center text-xs font-bold">Ampliar mapa de atuação</span></a>}
 </section>;
}

function CommercialDetailsForm({representativeId}:{representativeId:string}) {

 const qc=useQueryClient();
 const [values,setValues]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const fields=[
  {key:"phone",label:"Telefone / WhatsApp"},{key:"street_address",label:"Endereço"},
  {key:"address_number",label:"Número"},{key:"neighborhood",label:"Bairro"},
  {key:"postal_code",label:"CEP"},{key:"city",label:"Cidade"},
  {key:"state",label:"Estado (UF)"},{key:"region",label:"Região de atuação"},
  {key:"service_cities",label:"Cidades atendidas"},{key:"cpf",label:"CPF"},
  {key:"rg",label:"RG"},{key:"map_url",label:"Endereço da imagem do mapa"}
 ] as const;
 const {data,error,isLoading}=useQuery({
  queryKey:["commercial-representative-details",representativeId],
  retry:false,
  queryFn:async()=>{
   const {data,error}=await supabase.from("commercial_representative_details" as never).select("*").eq("representative_id",representativeId).maybeSingle();
   if(error)throw error;
   return data as Record<string,string>|null;
  }
 });
 useEffect(()=>{
  if(!isLoading&&!error&&!loaded){
   setValues(Object.fromEntries(fields.map(f=>[f.key,String(data?.[f.key]??"")])));
   setLoaded(true);
  }
 },[isLoading,error,loaded,data]);
 async function save(){
  setBusy(true);
  const payload={representative_id:representativeId,...Object.fromEntries(fields.map(f=>[f.key,(values[f.key]??"").trim()]))};
  const {data:saved,error}=await supabase.from("commercial_representative_details" as never).upsert(payload as never,{onConflict:"representative_id"}).select("representative_id").maybeSingle();
  setBusy(false);
  if(error||!saved){toast.error("O banco não confirmou os dados cadastrais: "+(error?.message??"Nenhum registro atualizado."));return;}
  toast.success("Endereço, telefone e região salvos.");
  await qc.invalidateQueries({queryKey:["commercial-representative-details",representativeId]});
 }
 return <div className="space-y-3">
  {isLoading&&<p>Carregando dados cadastrais…</p>}
  {error&&<p role="alert" className="text-red-700">A ficha cadastral precisa ser ativada no banco: {error.message}</p>}
  {!error&&loaded&&<>
   {fields.map(f=><label key={f.key} className="block text-sm font-bold">{f.label}<input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal" value={values[f.key]??""} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))}/></label>)}
   <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-11 w-full rounded-lg bg-[#102a52] px-3 font-bold text-white disabled:opacity-50">{busy?"Salvando…":"Salvar endereço e dados cadastrais"}</button>
  </>}
 </div>;
}
