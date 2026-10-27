import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Pencil, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/pessoas")({
  component: Pessoas,
  head: () => ({ meta: [{ title: "Pessoal | Netinho" }] }),
});
type Role = "Visitante" | "Vendedor" | "Representante" | "Administrador";
type Person = { id:string; full_name:string; email:string; site_role:Role; access_active:boolean; territory_uf:string|null; territory_cities:string|null; supervisor_id:string|null; phone:string|null };
const roles:Role[] = ["Visitante","Vendedor","Representante","Administrador"];
function Pessoas() {
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const qc=useQueryClient();
 const [adding,setAdding]=useState(false);
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
 if(loadingMe)return <p className="p-5">Carregando…</p>;
 if(!me?.isAdmin)return <p className="p-5">Acesso restrito ao administrador.</p>;
 return <main className="mx-auto max-w-4xl space-y-4 px-3 py-5 text-[#102a52]">
  <div className="flex items-stretch gap-2"><header className="flex min-h-16 min-w-0 flex-1 items-center justify-center rounded-2xl bg-[#102a52] px-3 py-4 text-white"><h1 className="text-center text-2xl font-black sm:text-3xl">PESSOAL</h1></header><button type="button" onClick={()=>setAdding(true)} className="inline-flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#d4af37] bg-white px-3 text-xs font-extrabold text-[#102a52]" aria-label="Adicionar nova pessoa"><UserPlus size={22}/>Adicionar</button></div>
  {adding&&<div role="dialog" aria-modal="true" aria-label="Adicionar nova pessoa" className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-3"><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 text-[#102a52] shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Adicionar pessoa</h2><button type="button" aria-label="Fechar" onClick={()=>setAdding(false)}><X size={22}/></button></div><p className="text-sm text-slate-600">Novo cadastro comercial. O acesso ao site exige uma conta de usuário vinculada.</p><label className="block text-sm font-bold">Nome completo<input value={newName} onChange={e=>setNewName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-3"/></label><label className="block text-sm font-bold">E-mail<input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-3"/></label><button type="button" disabled={creating} onClick={()=>void addPerson()} className="min-h-12 w-full rounded-lg bg-[#102a52] px-4 font-bold text-white disabled:opacity-50">{creating?"Adicionando…":"Adicionar pessoa"}</button></div></div>}
  
  {isLoading&&<p>Carregando pessoas…</p>}{error&&<p role="alert" className="text-red-700">Não foi possível carregar os cadastros. A atualização do banco de dados pode estar pendente.</p>}
  {[...people.map(p=>({kind:"person" as const,id:p.id,name:p.full_name||"Sem nome",record:p})),...representatives.filter(rep=>!people.some(p=>p.email?.trim().toLowerCase()===rep.email?.trim().toLowerCase())).map(rep=>({kind:"representative" as const,id:rep.id,name:rep.full_name||"Sem nome",record:rep}))].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(entry=>entry.kind==="person"
   ? <PersonCard key={`person-${entry.id}`} person={entry.record} people={people} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-people"]});void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["access"]});}}/>
   : <RepresentativeCard key={`representative-${entry.id}`} representative={entry.record} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});}}/>)}
  {loadingRepresentatives&&<p>Carregando representantes…</p>}
  {representativesError&&<p role="alert" className="text-red-700">Não foi possível carregar os representantes comerciais.</p>}
  {!isLoading&&!error&&people.length===0&&representatives.length===0&&<p className="rounded-xl bg-white p-4">Nenhuma pessoa cadastrada.</p>}
 </main>;
}
function PersonCard({person,people,onSaved}:{person:Person;people:Person[];onSaved:()=>void}) {
 const [name,setName]=useState(person.full_name??"");
 const [phone,setPhone]=useState(person.phone??"");
 const [role,setRole]=useState<Role>(person.site_role);
 const [active,setActive]=useState(person.access_active);
 const [uf,setUf]=useState(person.territory_uf??"");
 const [cities,setCities]=useState(person.territory_cities??"");
 const [cityBase,setCityBase]=useState("");
 const [region,setRegion]=useState("");
 const [mapUrl,setMapUrl]=useState("");
 const [mapFile,setMapFile]=useState<File|null>(null);
 const [supervisor,setSupervisor]=useState(person.supervisor_id??"");
 const [busy,setBusy]=useState(false);
 const [open,setOpen]=useState(false);

 const sales=role==="Vendedor"||role==="Representante";
 const {data:territory}=useQuery({queryKey:["person-territory",person.id],enabled:open,queryFn:async()=>{
  const {data,error}=await supabase.from("person_territories" as never).select("city_base,region,map_url").eq("user_id",person.id).maybeSingle();
  if(error)throw error;
  const value=data as {city_base:string;region:string;map_url:string}|null;
  setCityBase(value?.city_base??"");setRegion(value?.region??"");setMapUrl(value?.map_url??"");
  return value;
 }});
 const effectiveCity=cityBase;
 const effectiveRegion=region;
 const effectiveMap=mapUrl;

 async function save(){
  if(!name.trim()){toast.error("Informe o nome da pessoa.");return;}
  setBusy(true);
  const {error}=await supabase.rpc("admin_set_person" as never,{p_user:person.id,p_role:role,p_active:active,p_uf:uf,p_cities:cities,p_supervisor:supervisor||null} as never);
  if(error){setBusy(false);toast.error("Não foi possível salvar permissões: "+error.message);return;}
  const {error:profileError}=await supabase.from("profiles").update({full_name:name.trim(),phone:phone.trim()||null}).eq("id",person.id);
  if(profileError){setBusy(false);toast.error("Permissões salvas, mas nome/telefone não: "+profileError.message);onSaved();return;}
  let image=effectiveMap.trim();
  if(mapFile){
   const extension=mapFile.name.split(".").pop()?.toLowerCase()||"webp";
   const path=person.id+"/mapa-"+Date.now()+"."+extension;
   const uploaded=await supabase.storage.from("territory-maps").upload(path,mapFile,{contentType:mapFile.type});
   if(uploaded.error){setBusy(false);toast.error("Erro ao enviar mapa: "+uploaded.error.message);return;}
   image=supabase.storage.from("territory-maps").getPublicUrl(path).data.publicUrl;
  }
  const {error:territoryError}=await supabase.from("person_territories" as never).upsert({user_id:person.id,city_base:effectiveCity.trim(),region:effectiveRegion.trim(),map_url:image} as never,{onConflict:"user_id"});
  setBusy(false);
  if(territoryError){toast.error("Permissões salvas, mas região/mapa não: "+territoryError.message);return;}
  setMapUrl(image);setMapFile(null);toast.success("Pessoa e região atualizadas.");onSaved();setOpen(false);
 }
 return <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
  <button type="button" onClick={()=>setOpen(true)} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
   <span className="min-w-0"><strong className="block break-words text-lg">{person.full_name||"Sem nome"}</strong><span className="block break-all text-xs text-slate-600">{person.email}</span></span>
   <span className="shrink-0 text-right text-sm font-bold">{person.access_active?"Ativo":"Inativo"}</span>
  </button>
  <div className="mt-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>setOpen(true)} aria-label={`Editar ficha de ${person.full_name||person.email}`} title="Editar ficha (somente administrador)" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900"><Pencil size={18}/> Editar</button>
   <span className={`rounded-lg px-3 py-1 text-xs font-bold ${active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{active?"Ativo":"Inativo"}</span>
   <button type="button" disabled={busy} onClick={async()=>{
    const identity=person.full_name||person.email;
    if(!window.confirm(`Excluir DEFINITIVAMENTE ${identity}? A conta de login e o cadastro serão apagados. Esta ação não pode ser desfeita.`))return;
    setBusy(true);
    const {data,error}=await supabase.functions.invoke("delete-person",{body:{userId:person.id}});
    setBusy(false);
    if(error||!data||typeof data.message!=="string"||!data.message.includes("excluída permanentemente")){toast.error("Não foi possível excluir: "+(data?.message||error?.message||"Erro desconhecido"));return;}
    toast.success("Usuário excluído permanentemente.");
    onSaved();
   }} title="Excluir usuário permanentemente" aria-label={`Excluir definitivamente ${person.full_name||person.email}`} className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 disabled:opacity-40"><Trash2 size={19}/></button>
  </div>

  {open&&<div role="dialog" aria-modal="true" aria-label={`Editar ${person.full_name||person.email}`} className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-3"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-[#102a52] shadow-2xl"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-black">Editar usuário</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar edição" className="rounded-lg p-2"><X size={22}/></button></div><div className="space-y-4">
   <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><strong className="block">Ficha de dados — campos editáveis</strong><label className="block font-bold">Nome completo<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label><label className="block font-bold">Telefone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label><p><strong>E-mail de acesso:</strong> {person.email} <span className="text-slate-600">(vinculado à conta de login)</span></p></div>
   <RepresentativeDetails name={person.full_name} email={person.email} />
   <label className="block text-sm font-bold">Tipo de acesso<select value={role} onChange={e=>setRole(e.target.value as Role)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{roles.map(r=><option key={r}>{r}</option>)}</select></label>
   <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} className="h-5 w-5"/> Acesso ativo</label>
   <div className="rounded-lg bg-[#eaf2ff] p-3 text-sm"><strong>Permissões automáticas:</strong> {role==="Visitante"?"Catálogo e preços à vista, sem pedidos.":role==="Administrador"?"Administração, catálogo completo, preços, estoque e pedidos.":role==="Representante"?"Catálogo completo, preços à vista e a prazo, estoque, pedidos e equipe.":"Catálogo completo, preços à vista e a prazo, estoque e pedidos."}</div>
   {sales&&<div className="space-y-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3">
    <strong>Área de atuação</strong>
    <label className="block text-sm font-bold">Cidade-base de atuação<input value={effectiveCity} onChange={e=>setCityBase(e.target.value)} placeholder="Ex.: Sorocaba" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    <label className="block text-sm font-bold">Região de atuação<input value={effectiveRegion} onChange={e=>setRegion(e.target.value)} placeholder="Ex.: Sorocaba e região, DDD 15" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    <label className="block text-sm font-bold">Estado(s) — UF<input value={uf} onChange={e=>setUf(e.target.value)} placeholder="Ex.: SP, MG" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    <label className="block text-sm font-bold">Cidades atendidas<textarea value={cities} onChange={e=>setCities(e.target.value)} rows={2} placeholder="Ex.: Sorocaba, Itu, Votorantim" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"/></label>
    {role==="Vendedor"&&<label className="block text-sm font-bold">Representante responsável<select value={supervisor} onChange={e=>setSupervisor(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Não vinculado</option>{people.filter(p=>p.id!==person.id&&p.site_role==="Representante").map(p=><option value={p.id} key={p.id}>{p.full_name||p.email}</option>)}</select></label>}
    <div className="space-y-2 rounded-lg border border-blue-200 bg-white p-3">
      <strong className="block text-sm">Mapa de imagem da região de atuação</strong>
      <label className="block text-sm font-bold">Enviar imagem (PNG, JPG ou WebP, até 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0]??null;if(file&&file.size>5*1024*1024){toast.error("Limite de 5 MB.");e.target.value="";return;}setMapFile(file);}} className="mt-1 block w-full text-sm"/></label>
      <label className="block text-sm font-bold">Ou endereço da imagem<input value={effectiveMap} onChange={e=>{setMapUrl(e.target.value);setMapFile(null);}} placeholder="/images/territories/mapa.webp" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"/></label>
      {mapFile?<p className="text-xs">Imagem selecionada: {mapFile.name}</p>:effectiveMap?<img src={effectiveMap} alt="Mapa da região de atuação" className="max-h-72 w-full object-contain"/>:<p className="text-xs text-slate-600">Sem mapa personalizado.</p>}
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
function RepresentativeCard({representative,onSaved}:{representative:CommercialRepresentative;onSaved:()=>void}) {
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState(representative.full_name);
 const [email,setEmail]=useState(representative.email);
 const [active,setActive]=useState(representative.active);
 async function save(){
  if(!name.trim()||!/^\S+@\S+\.\S+$/.test(email.trim())){toast.error("Informe nome e e-mail válidos.");return;}
  setBusy(true);
  const {error}=await supabase.from("commercial_representatives").update({full_name:name.trim(),email:email.trim().toLowerCase(),active}).eq("id",representative.id);
  setBusy(false);
  if(error){toast.error("Não foi possível salvar: "+error.message);return;}
  toast.success("Representante atualizado.");onSaved();setOpen(false);
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
  <button type="button" onClick={()=>setOpen(true)} aria-expanded={open} className="w-full text-left"><strong className="block break-words text-lg">{representative.full_name}</strong><span className="block break-all text-xs text-slate-600">{representative.email}</span></button>
  <div className="mt-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900" aria-label={`Editar ${representative.full_name}`}><Pencil size={18}/>Editar</button>
   <span className={`rounded-lg px-3 py-1 text-xs font-bold ${active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{active?"Ativo":"Inativo"}</span>
   <button type="button" disabled={busy} onClick={()=>void remove()} title="Excluir cadastro comercial" aria-label={`Excluir cadastro comercial de ${representative.full_name}`} className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 disabled:opacity-40"><Trash2 size={19}/></button>
  </div>
  <p className="mt-2 text-xs font-bold text-amber-800">Atribuição: Representante (cadastro comercial)</p>
  {open&&<div role="dialog" aria-modal="true" aria-label={`Editar ${representative.full_name}`} className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-3"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-[#102a52] shadow-2xl"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">Editar representante</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar edição" className="rounded-lg p-2"><X size={22}/></button></div><div className="space-y-3">
   <h3 className="text-lg font-extrabold">Ficha completa do representante</h3>
   <p className="text-sm"><strong>Atribuição:</strong> Representante comercial</p>
   <RepresentativeDetails name={representative.full_name} email={representative.email} />
   <label className="block text-sm font-bold">Nome<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
   <label className="block text-sm font-bold">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
   <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Status ativo</label>
   <p className="text-xs text-slate-600">Este é um cadastro comercial ainda não vinculado à ficha de usuário. Sua exclusão não apaga uma conta Google ou outros registros.</p>
   <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-11 w-full rounded-lg bg-[#102a52] px-4 py-2 font-bold text-white disabled:opacity-50">Salvar representante</button>
  </div></div></div>}
 </article>;
}

function RepresentativeDetails({name,email}:{name:string;email:string}) {
 const {data:record,isLoading,error}=useQuery({
  queryKey:["admin-representative-detail",name,email],
  queryFn:async()=>{
   const {data:profiles,error:profileError}=await supabase.from("representative_profiles").select("slug,full_name,email,phone,region");
   if(profileError)throw profileError;
   const norm=(v:string|null|undefined)=>(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
   const profile=profiles?.find(p=>!!email&&norm(p.email)===norm(email))??profiles?.find(p=>norm(p.full_name)===norm(name));
   if(!profile)return null;
   const {data:details,error:detailsError}=await supabase.from("representative_private_details").select("city,state,service_cities,street_address,neighborhood,postal_code,cpf,rg").eq("slug",profile.slug).maybeSingle();
   if(detailsError)throw detailsError;
   return {profile,details};
  },
  retry:false
 });
 const map=/abdenego|abdnego/i.test(name) ? "/images/territories/abdenego.webp" : /livaldo/i.test(name) ? "/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png" : null;
 return <section className="space-y-2 rounded-xl border border-blue-200 bg-[#f8fbff] p-3 text-sm">
  <h4 className="flex items-center gap-2 font-extrabold"><span>Região, cidades e mapa de atuação</span></h4>
  {isLoading&&<p>Carregando informações de atuação…</p>}
  {error&&<p role="alert" className="text-red-700">Não foi possível consultar a ficha regional.</p>}
  {!isLoading&&!error&&<div className="space-y-1">
   <p><strong>Região:</strong> {record?.profile.region||"Não cadastrada"}</p>
   <p><strong>Estado (UF):</strong> {record?.details?.state||"Não cadastrado"}</p>
   <p><strong>Cidade:</strong> {record?.details?.city||"Não cadastrada"}</p>
   <p><strong>Cidades atendidas:</strong> {record?.details?.service_cities||"Não cadastradas"}</p>
   <p><strong>Telefone:</strong> {record?.profile.phone||"Não cadastrado"}</p>
   <p><strong>Endereço:</strong> {[record?.details?.street_address,record?.details?.neighborhood,record?.details?.postal_code].filter(Boolean).join(" · ")||"Não cadastrado"}</p>
   <p><strong>CPF:</strong> {record?.details?.cpf||"Não cadastrado"}</p>
   <p><strong>RG:</strong> {record?.details?.rg||"Não cadastrado"}</p>
  </div>}
  {map?<a href={map} target="_blank" rel="noreferrer" className="block rounded-lg border border-blue-200 bg-white p-2"><img src={map} alt={`Mapa de atuação de ${name}`} className="max-h-80 w-full object-contain"/><span className="mt-1 block text-center text-xs font-bold">Ampliar mapa de atuação</span></a>:<p className="rounded-lg bg-white p-3 text-xs text-slate-600">Não há imagem de mapa vinculada a este representante.</p>}
 </section>;
}
