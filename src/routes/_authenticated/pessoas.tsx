import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/pessoas")({
  component: Pessoas,
  head: () => ({ meta: [{ title: "Pessoas e acessos | Netinho" }] }),
});
type Role = "Visitante" | "Vendedor" | "Representante" | "Administrador";
type Person = { id:string; full_name:string; email:string; site_role:Role; access_active:boolean; territory_uf:string|null; territory_cities:string|null; supervisor_id:string|null; phone:string|null };
const roles:Role[] = ["Visitante","Vendedor","Representante","Administrador"];
function Pessoas() {
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const qc=useQueryClient();
 const {data:representatives=[],isLoading:loadingRepresentatives,error:representativesError}=useQuery({queryKey:["admin-commercial-representatives"],enabled:!!me?.isAdmin,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representatives").select("id,full_name,email,active").order("full_name");if(error)throw error;return data??[];}});
 const {data:people=[],isLoading,error}=useQuery({queryKey:["admin-people"],enabled:!!me?.isAdmin,queryFn:async()=>{
  const {data,error}=await supabase.from("profiles").select("id,full_name,email,site_role,access_active,territory_uf,territory_cities,supervisor_id,phone").order("full_name");
  if(error)throw error;return (data??[]) as Person[];
 }});
 if(loadingMe)return <p className="p-5">Carregando…</p>;
 if(!me?.isAdmin)return <p className="p-5">Acesso restrito ao administrador.</p>;
 return <main className="mx-auto max-w-4xl space-y-4 px-3 py-5 text-[#102a52]">
  <header className="rounded-2xl bg-[#102a52] p-5 text-white"><Link to="/admin" className="text-sm text-amber-300">← Administração</Link><h1 className="mt-2 text-3xl font-black">Pessoas</h1><p className="mt-1 text-sm">Um único lugar para definir perfil, acesso e região de atuação.</p></header>
  <p className="rounded-xl bg-white p-3 text-sm">Todas as pessoas cadastradas aparecem abaixo. Escolha a atribuição na coluna Status e salve a ficha.</p>
  {isLoading&&<p>Carregando pessoas…</p>}{error&&<p role="alert" className="text-red-700">Não foi possível carregar os cadastros. A atualização do banco de dados pode estar pendente.</p>}
  <p className="rounded-xl bg-blue-50 p-3 text-sm"><strong>Cadastros:</strong> {people.length} pessoas com perfil de acesso e {representatives.length} representantes comerciais cadastrados. Nomes genéricos como "Vendedor" vêm do cadastro original; confira o e-mail antes de editar.</p>
  {[...people.map(p=>({kind:"person" as const,id:p.id,name:p.full_name||"Sem nome",record:p})),...representatives.filter(rep=>!people.some(p=>p.email?.trim().toLowerCase()===rep.email?.trim().toLowerCase())).map(rep=>({kind:"representative" as const,id:rep.id,name:rep.full_name||"Sem nome",record:rep}))].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(entry=>entry.kind==="person"
   ? <PersonCard key={`person-${entry.id}`} person={entry.record} people={people} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-people"]});void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["access"]});}}/>
   : <RepresentativeCard key={`representative-${entry.id}`} representative={entry.record} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});}}/>)}
  {loadingRepresentatives&&<p>Carregando representantes…</p>}
  {representativesError&&<p role="alert" className="text-red-700">Não foi possível carregar os representantes comerciais.</p>}
  {!isLoading&&!error&&people.length===0&&representatives.length===0&&<p className="rounded-xl bg-white p-4">Nenhuma pessoa cadastrada.</p>}
 </main>;
}
function PersonCard({person,people,onSaved}:{person:Person;people:Person[];onSaved:()=>void}) {
 const [role,setRole]=useState<Role>(person.site_role);
 const [active,setActive]=useState(person.access_active);
 const [uf,setUf]=useState(person.territory_uf??"");
 const [cities,setCities]=useState(person.territory_cities??"");
 const [supervisor,setSupervisor]=useState(person.supervisor_id??"");
 const [busy,setBusy]=useState(false);
 const [open,setOpen]=useState(false);

 const sales=role==="Vendedor"||role==="Representante";
 async function save(){
  if(!window.confirm(`Salvar o perfil ${role} para ${person.full_name||person.email}?`))return;
  setBusy(true);
  const {error}=await supabase.rpc("admin_set_person" as never,{p_user:person.id,p_role:role,p_active:active,p_uf:uf,p_cities:cities,p_supervisor:supervisor||null} as never);
  setBusy(false);
  if(error)toast.error("Não foi possível salvar: "+error.message);
  else{toast.success("Pessoa atualizada.");onSaved();setOpen(false);}
 }
 return <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
  <button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
   <span className="min-w-0"><strong className="block break-words text-lg">{person.full_name||"Sem nome"}</strong><span className="block break-all text-xs text-slate-600">{person.email}</span></span>
   <span className="shrink-0 text-right text-sm font-bold">{person.access_active?"Ativo":"Inativo"}</span>
  </button>
  <div className="mt-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>setOpen(true)} aria-label={`Editar ficha de ${person.full_name||person.email}`} title="Editar ficha (somente administrador)" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900"><Pencil size={18}/> Editar</button>
   <span className={`rounded-lg px-3 py-1 text-xs font-bold ${active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{active?"Ativo":"Inativo"}</span>
   <button type="button" disabled={busy} onClick={async()=>{
    const identity=person.full_name||person.email;
    if(!window.confirm(`Excluir DEFINITIVAMENTE ${identity}? A conta de login e o cadastro serão apagados. Esta ação não pode ser desfeita.`))return;
    const confirmation=window.prompt(`Para confirmar a exclusão permanente de ${identity}, digite EXCLUIR:`);
    if(confirmation!=="EXCLUIR"){if(confirmation!==null)toast.error("Exclusão cancelada: confirmação incorreta.");return;}
    setBusy(true);
    const {data,error}=await supabase.functions.invoke("delete-person",{body:{userId:person.id}});
    setBusy(false);
    if(error||!data||typeof data.message!=="string"||!data.message.includes("excluída permanentemente")){toast.error("Não foi possível excluir: "+(data?.message||error?.message||"Erro desconhecido"));return;}
    toast.success("Usuário excluído permanentemente.");
    onSaved();
   }} title="Excluir usuário permanentemente" aria-label={`Excluir definitivamente ${person.full_name||person.email}`} className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 disabled:opacity-40"><Trash2 size={19}/></button>
  </div>
  <label className="mt-2 block text-sm font-bold">Status · Atribuição<select value={role} onChange={e=>{setRole(e.target.value as Role);setOpen(true);}} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{roles.map(v=><option key={v}>{v}</option>)}</select></label>
  {open&&<div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
   <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><strong>Ficha de dados</strong><p>Nome: {person.full_name||"Não informado"}</p><p>E-mail: {person.email}</p><p>Telefone: {person.phone||"Não informado"}</p><p>Atribuição: {person.site_role}</p><p>Estado(s): {uf||"Não informado"}</p><p>Cidades: {cities||"Não informadas"}</p></div>
   <label className="block text-sm font-bold">Tipo de acesso<select value={role} onChange={e=>setRole(e.target.value as Role)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{roles.map(r=><option key={r}>{r}</option>)}</select></label>
   <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} className="h-5 w-5"/> Acesso ativo</label>
   <div className="rounded-lg bg-[#eaf2ff] p-3 text-sm"><strong>Permissões automáticas:</strong> {role==="Visitante"?"Catálogo e preços à vista, sem pedidos.":role==="Administrador"?"Administração, catálogo completo, preços, estoque e pedidos.":role==="Representante"?"Catálogo completo, preços à vista e a prazo, estoque, pedidos e equipe.":"Catálogo completo, preços à vista e a prazo, estoque e pedidos."}</div>
   {sales&&<div className="space-y-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3">
    <strong>Área de atuação</strong>
    <label className="block text-sm font-bold">Estado(s) — UF<input value={uf} onChange={e=>setUf(e.target.value)} placeholder="Ex.: SP, MG" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
    <label className="block text-sm font-bold">Cidades atendidas<textarea value={cities} onChange={e=>setCities(e.target.value)} rows={2} placeholder="Ex.: Sorocaba, Itu, Votorantim" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"/></label>
    {role==="Vendedor"&&<label className="block text-sm font-bold">Representante responsável<select value={supervisor} onChange={e=>setSupervisor(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Não vinculado</option>{people.filter(p=>p.id!==person.id&&p.site_role==="Representante").map(p=><option value={p.id} key={p.id}>{p.full_name||p.email}</option>)}</select></label>}
    {/abdenego|abdnego/i.test(person.full_name+" "+person.email) && <figure className="overflow-hidden rounded-lg border border-blue-200 bg-white p-2"><img src="/images/territories/abdenego.webp" alt="Mapa da área de atuação de Abdenego" className="max-h-80 w-full object-contain"/><figcaption className="mt-1 text-center text-xs">Mapa de atuação cadastrado</figcaption></figure>}
    {/livaldo/i.test(person.full_name+" "+person.email) && <figure className="overflow-hidden rounded-lg border border-blue-200 bg-white p-2"><img src="/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png" alt="Mapa da área de atuação de Livaldo" className="max-h-80 w-full object-contain"/><figcaption className="mt-1 text-center text-xs">Mapa de atuação cadastrado</figcaption></figure>}
    <p className="text-xs text-slate-600">As localidades antigas e os mapas existentes não serão apagados. Estes campos registram a área na ficha da pessoa.</p>
   </div>}
   <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-12 w-full rounded-lg bg-[#102a52] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?"Salvando…":"Salvar ficha e permissões"}</button>
  </div>}
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
  if(!name.trim()||!/^\\S+@\\S+\\.\\S+$/.test(email.trim())){toast.error("Informe nome e e-mail válidos.");return;}
  setBusy(true);
  const {error}=await supabase.from("commercial_representatives").update({full_name:name.trim(),email:email.trim().toLowerCase(),active}).eq("id",representative.id);
  setBusy(false);
  if(error){toast.error("Não foi possível salvar: "+error.message);return;}
  toast.success("Representante atualizado.");onSaved();setOpen(false);
 }
 async function remove(){
  if(!window.confirm(`Excluir DEFINITIVAMENTE o cadastro comercial de ${representative.full_name}? Esta ação não pode ser desfeita.`))return;
  if(window.prompt("Digite EXCLUIR para confirmar:")!=="EXCLUIR")return;
  setBusy(true);
  const {error}=await supabase.from("commercial_representatives").delete().eq("id",representative.id);
  setBusy(false);
  if(error){toast.error("Não foi possível excluir: "+error.message);return;}
  toast.success("Cadastro comercial excluído.");onSaved();
 }
 return <article className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
  <button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} className="w-full text-left"><strong className="block break-words text-lg">{representative.full_name}</strong><span className="block break-all text-xs text-slate-600">{representative.email}</span></button>
  <div className="mt-2 flex items-center justify-between gap-2">
   <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900" aria-label={`Editar ${representative.full_name}`}><Pencil size={18}/>Editar</button>
   <span className={`rounded-lg px-3 py-1 text-xs font-bold ${active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{active?"Ativo":"Inativo"}</span>
   <button type="button" disabled={busy} onClick={()=>void remove()} title="Excluir cadastro comercial" aria-label={`Excluir cadastro comercial de ${representative.full_name}`} className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 disabled:opacity-40"><Trash2 size={19}/></button>
  </div>
  <p className="mt-2 text-xs font-bold text-amber-800">Atribuição: Representante (cadastro comercial)</p>
  {open&&<div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
   <label className="block text-sm font-bold">Nome<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
   <label className="block text-sm font-bold">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
   <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Status ativo</label>
   <p className="text-xs text-slate-600">Este é um cadastro comercial ainda não vinculado à ficha de usuário. Sua exclusão não apaga uma conta Google ou outros registros.</p>
   <button type="button" disabled={busy} onClick={()=>void save()} className="min-h-11 w-full rounded-lg bg-[#102a52] px-4 py-2 font-bold text-white disabled:opacity-50">Salvar representante</button>
  </div>}
 </article>;
}
