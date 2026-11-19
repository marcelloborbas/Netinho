import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2, Pencil, X, UserPlus, ArrowLeft, UserRound, Search, Users, ShieldCheck, UserCheck, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { PersonFileTabs, type PersonFileTabId } from "@/components/people/PersonFileTabs";
import { CustomerPortfolio } from "@/components/people/CustomerPortfolio";
import { CommercialAreaDdds, parseAreaDdds, RepresentativeRecordFields, useRepresentativeRecord } from "@/components/people/RepresentativeRecord";

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
 const [search,setSearch]=useState("");
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

 const {data:representatives=[],isLoading:loadingRepresentatives,error:representativesError}=useQuery({queryKey:["admin-commercial-representatives"],enabled:!!me?.isAdmin,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representatives").select("id,user_id,full_name,email,active").order("full_name");if(error)throw error;return data??[];}});
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
 const linkedCommercialFor=(person:Person)=>representatives.find(rep=>(rep.user_id&&rep.user_id===person.id)||(!!person.email&&rep.email?.trim().toLowerCase()===person.email.trim().toLowerCase()));
 const matchesRate=(rate:number|undefined)=>commissionFilter==="Todas"||(commissionFilter==="Definida"?rate!=null:commissionFilter==="Não definida"?rate==null:rate!=null&&Number(rate)===Number(commissionFilter));
 const activePeople=people.filter(p=>p.access_active).length;
 const activeRepresentatives=representatives.filter(r=>r.active).length;
 const visibleEntries=[...people.filter(p=>(filterRole==="Todos"||p.site_role===filterRole)&&matchesRate(rateForPerson(p.id))&&(!search.trim()||[p.full_name,p.email,p.phone].some(v=>v?.toLowerCase().includes(search.trim().toLowerCase())))).map(p=>({kind:"person" as const,id:p.id,name:p.full_name||"Sem nome",record:p})),...representatives.filter(rep=>(filterRole==="Todos"||filterRole==="Representante")&&matchesRate(rateForRepresentative(rep.id))&&!people.some(p=>(!!rep.user_id&&p.id===rep.user_id)||(!!p.email&&p.email.trim().toLowerCase()===rep.email?.trim().toLowerCase()))&&(!search.trim()||[rep.full_name,rep.email].some(v=>v?.toLowerCase().includes(search.trim().toLowerCase())))).map(rep=>({kind:"representative" as const,id:rep.id,name:rep.full_name||"Sem nome",record:rep}))].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 if(loadingMe)return <p className="p-5">Carregando…</p>;
 if(!me?.isAdmin)return <p className="p-5">Acesso restrito ao administrador.</p>;

 return <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 text-[#102a52] sm:px-5 lg:py-8">
  
  {adding&&<div role="dialog" aria-modal="true" aria-label="Adicionar nova pessoa" className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-3"><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 text-[#102a52] shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Adicionar pessoa</h2><button type="button" aria-label="Fechar" onClick={()=>setAdding(false)}><X size={22}/></button></div><p className="text-sm text-slate-600">Este formulário cria apenas um contato comercial, sem login nem permissões. Para atribuir Visitante, Vendedor, Representante ou Administrador, edite uma conta já cadastrada na lista de usuários.</p><label className="block text-sm font-bold">Nome completo<input value={newName} onChange={e=>setNewName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-3"/></label><label className="block text-sm font-bold">E-mail<input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-3"/></label><button type="button" disabled={creating} onClick={()=>void addPerson()} className="min-h-12 w-full rounded-lg bg-[#102a52] px-4 font-bold text-white disabled:opacity-50">{creating?"Adicionando…":"Adicionar pessoa"}</button></div></div>}
  
  <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2144] via-[#123461] to-[#1b4770] p-5 text-white shadow-xl sm:p-7">
   <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5"/>
   <div className="relative flex flex-wrap items-start justify-between gap-4">
    <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-amber-200"><ShieldCheck size={14}/> Painel administrativo</div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Gestão de equipe</h1><p className="mt-1 max-w-xl text-sm text-blue-100">Pessoas, representantes, acessos e comissões em um só lugar.</p></div>
    <button type="button" onClick={()=>setAdding(true)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#d9b34c] px-4 text-sm font-extrabold text-[#102a52] shadow-lg transition hover:bg-amber-300"><UserPlus size={18}/>Adicionar pessoa</button>
   </div>
   <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"><div className="flex items-center gap-2 text-xs font-semibold text-blue-100"><Users size={15}/>Pessoas cadastradas</div><div className="mt-1 text-2xl font-black">{people.length}</div></div>
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur"><div className="flex items-center gap-2 text-xs font-semibold text-blue-100"><UserCheck size={15}/>Acessos ativos</div><div className="mt-1 text-2xl font-black">{activePeople}</div></div>
    <div className="col-span-2 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:col-span-1"><div className="flex items-center gap-2 text-xs font-semibold text-blue-100"><ShieldCheck size={15}/>Representantes ativos</div><div className="mt-1 text-2xl font-black">{activeRepresentatives}</div></div>
   </div>
  </section>
  <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
   <div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#bd9229]"/><h2 className="text-base font-black">Localizar e filtrar</h2></div>
   <label className="relative block"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Buscar pessoa" placeholder="Buscar por nome, e-mail ou WhatsApp..." value={search} onChange={e=>setSearch(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-[#c49a22] focus:bg-white focus:ring-2 focus:ring-amber-100"/></label>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Perfil<select aria-label="Filtrar por perfil" value={filterRole} onChange={e=>setFilterRole(e.target.value as Role|"Todos")} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#102a52]"><option value="Todos">Todos</option>{roles.map(role=><option key={role} value={role}>{role}</option>)}</select></label>
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Comissão<select aria-label="Filtrar por comissão" value={commissionFilter} onChange={e=>setCommissionFilter(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[#102a52]"><option>Todas</option><option>Definida</option><option>Não definida</option>{[0.5,1,1.5,2,2.5,3,3.5].map(n=><option key={n} value={n}>{n.toLocaleString("pt-BR")}%</option>)}</select></label>
    <div className="col-span-2 flex items-end sm:col-span-1"><div className="w-full rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500"><span className="font-black text-[#102a52]">{visibleEntries.length}</span> resultado(s) encontrado(s)</div></div>
   </div>
   
   {(ratesError||commercialRatesError)&&<p role="alert" className="text-xs font-semibold text-red-700">Não foi possível consultar todas as comissões. O filtro por comissão pode estar incompleto.</p>}
  </section>
  {isLoading&&<p>Carregando pessoas…</p>}{error&&<p role="alert" className="text-red-700">Não foi possível carregar os cadastros. A atualização do banco de dados pode estar pendente.</p>}
  <section className="space-y-3"><div className="flex items-center justify-between px-1"><h2 className="text-lg font-black">Equipe e representantes</h2><span className="text-xs font-semibold text-slate-500">Selecione editar para abrir a ficha</span></div>{visibleEntries.map(entry=>entry.kind==="person"
   ? <PersonCard key={`person-${entry.id}`} person={entry.record} people={people} monthlySales={monthlySalesFor(entry.id)} linkedCommercial={linkedCommercialFor(entry.record)} editingPage={editing===`person:${entry.id}`} onClose={()=>setEditing(null)} onEdit={()=>setEditing(`person:${entry.id}`)} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-people"]});void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["access"]});void qc.invalidateQueries({queryKey:["admin-all-person-commissions"]});}}/>
   : <RepresentativeCard key={`representative-${entry.id}`} representative={entry.record} monthlySales="Sem vínculo com pedidos" editingPage={editing===`representative:${entry.id}`} onClose={()=>setEditing(null)} onEdit={()=>setEditing(`representative:${entry.id}`)} onSaved={()=>{void qc.invalidateQueries({queryKey:["admin-commercial-representatives"]});void qc.invalidateQueries({queryKey:["admin-all-commercial-commissions"]});}}/>)}
  </section>
  {loadingRepresentatives&&<p>Carregando representantes…</p>}
  {representativesError&&<p role="alert" className="text-red-700">Não foi possível carregar os representantes comerciais.</p>}
  {!isLoading&&!error&&people.length===0&&representatives.length===0&&<p className="rounded-xl bg-white p-4">Nenhuma pessoa cadastrada.</p>}
 </main>;
}
function SalesMiniChart({sellerId}:{sellerId:string}) {
 const {data:series=[],isLoading}=useQuery({
  queryKey:["admin-representative-sales-evolution",sellerId],
  enabled:!!sellerId,
  queryFn:async()=>{
   const now=new Date();
   const local=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(now);
   const year=Number(local.find(x=>x.type==="year")?.value);
   const month=Number(local.find(x=>x.type==="month")?.value);
   const months=Array.from({length:4},(_,i)=>{const d=new Date(Date.UTC(year,month-4+i,1));return {key:d.toISOString().slice(0,7),label:new Intl.DateTimeFormat("pt-BR",{month:"short",timeZone:"UTC"}).format(d).replace(".",""),value:0};});
   const start=new Date(Date.UTC(year,month-4,1)-86400000).toISOString();
   const end=new Date(Date.UTC(year,month,1)+86400000).toISOString();
   for(let offset=0;;offset+=500){
    const {data,error}=await supabase.from("orders").select("seller_id,created_at,total,kind,status").eq("seller_id",sellerId).gte("created_at",start).lt("created_at",end).order("created_at").range(offset,offset+499);
    if(error)throw error;
    for(const order of data??[]){
     if(order.kind==="orcamento"||order.status==="cancelled")continue;
     const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"}).formatToParts(new Date(order.created_at));
     const key=parts.find(x=>x.type==="year")?.value+"-"+parts.find(x=>x.type==="month")?.value;
     const target=months.find(m=>m.key===key);
     if(target)target.value+=Number(order.total??0);
    }
    if((data??[]).length<500)break;
   }
   return months;
  }
 });
 const max=Math.max(1,...series.map(x=>x.value));
 const points=series.map((x,i)=>`${8+i*48},${63-x.value/max*49}`).join(" ");
 const hasSales=series.some(x=>x.value>0);
 return <div className="flex h-[112px] min-w-0 flex-col justify-between" aria-label="Evolução de Vendas nos últimos quatro meses">
  <div className="text-right text-[10px] font-extrabold leading-tight text-[#102a52] sm:text-xs">Evolução de Vendas</div>
  {!sellerId?<span className="text-center text-[10px] text-slate-500">Sem vínculo com pedidos</span>:isLoading?<span className="text-center text-[10px] text-slate-500">Carregando…</span>:!hasSales?<span className="text-center text-[10px] text-slate-500">Sem vendas no período</span>:<svg viewBox="0 0 160 72" className="h-[72px] w-full" role="img" aria-label="Gráfico de vendas por mês"><path d="M8 63 H152" stroke="#cbd5e1" strokeWidth="1"/><polyline points={points} fill="none" stroke="#c49a22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>{series.map((x,i)=><circle key={x.key} cx={8+i*48} cy={63-x.value/max*49} r="3" fill="#c49a22"><title>{x.label}: {x.value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</title></circle>)}</svg>}
  <div className="flex justify-between text-[9px] text-slate-500">{series.map(x=><span key={x.key}>{x.label}</span>)}</div>
 </div>;
}
function PersonSummary({id,name,email,active,rate,role,phone,uf,sellerId,commercialId,onEdit}:{id:string;name:string;email?:string|null;active:boolean;rate:string;role:string;phone?:string|null;uf?:string|null;sellerId:string;commercialId?:string|undefined;onEdit?:(()=>void)|undefined}) {
 const {data:areaDdds=""}=useQuery({queryKey:["representative-area-ddds-summary",id,commercialId],enabled:role==="Representante",retry:false,queryFn:async()=>{for(const representativeId of [id,commercialId].filter(Boolean) as string[]){const {data,error}=await supabase.from("representative_area_ddds" as never).select("ddds").eq("representative_id",representativeId).maybeSingle();if(error)throw error;const value=(data as {ddds?:string}|null)?.ddds?.trim();if(value)return value;}return "";}});
 const {data:commercialDetails}=useQuery({queryKey:["commercial-representative-details",commercialId||id],enabled:role==="Representante"&&!!commercialId,retry:false,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representative_details" as never).select("phone,state").eq("representative_id",commercialId||id).maybeSingle();if(error)throw error;return data as {phone?:string;state?:string}|null;}});
 const displayPhone=phone||commercialDetails?.phone||"—";
 const displayUf=uf||commercialDetails?.state||"—";
 return <div className="space-y-2">
  <div className="grid grid-cols-[94px_minmax(0,1fr)_minmax(105px,0.9fr)] items-start gap-2 sm:grid-cols-[112px_minmax(0,1fr)_minmax(145px,1fr)] sm:gap-3">
   <div className="h-[112px] w-[94px] sm:w-[112px]"><PersonPhoto id={id} name={name}/></div>
   <div className="min-w-0">
    <div className="flex items-center gap-1"><strong className="truncate text-sm font-black sm:text-lg" title={name}>{name.trim().split(/\s+/)[0]||"Sem nome"}</strong><button type="button" onClick={onEdit} disabled={!onEdit} aria-label={`Editar ficha de ${name}`} title="Editar ficha" className="shrink-0 rounded-md p-1 text-[#c49a22] disabled:opacity-40"><Pencil size={17}/></button></div>
    <div className="mt-1 text-[11px] font-semibold text-slate-600">{role}</div>
    <div className="mt-2 flex flex-wrap items-center gap-1"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${active?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{active?"Ativo":"Inativo"}</span><span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-[#102a52]">{rate}</span></div>
   </div>
   <SalesMiniChart sellerId={sellerId}/>
  </div>
  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] font-semibold text-[#102a52]"><span>WhatsApp: {displayPhone}</span><span>DDD: {areaDdds||"—"}</span><span>UF: {displayUf}</span></div>
 </div>;
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
 return <label title="Escolher foto" className="relative flex h-full w-full shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-[#d4af37] bg-slate-100 text-[#102a52]">
  {photo?<img src={photo} alt={`Foto de ${name}`} className="h-full w-full object-cover"/>:<UserRound size={33}/>}
  <span className="absolute bottom-0 left-0 right-0 bg-[#102a52]/90 py-0.5 text-center text-[9px] font-bold text-white">{busy?"Enviando…":"Foto +"}</span>
  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} aria-label={`Selecionar foto de ${name}`} className="sr-only" onChange={e=>{void choose(e.target.files?.[0]);e.target.value="";}}/>
 </label>;
}
function PersonCard({person,people,monthlySales,linkedCommercial,onSaved,onEdit,editingPage=false,onClose}:{person:Person;people:Person[];monthlySales:string;linkedCommercial?:CommercialRepresentative|undefined;onSaved:()=>void;onEdit?:(()=>void)|undefined;editingPage?:boolean;onClose?:()=>void}) {
 const {data:me}=useQuery(meQuery);
 const qc=useQueryClient();
 const ownAccount=me?.id===person.id;
 const [name,setName]=useState(person.full_name??"");
 const [phone,setPhone]=useState(person.phone??"");
 const {data:phoneSources}=useQuery({
  queryKey:["representative-phone-sources",person.id,linkedCommercial?.id,person.email],
  enabled:person.site_role==="Representante",
  retry:false,
  queryFn:async()=>{
   const [commercialResult,publicResult]=await Promise.all([
    linkedCommercial?.id
     ? supabase.from("commercial_representative_details" as never).select("phone").eq("representative_id",linkedCommercial.id).maybeSingle()
     : Promise.resolve({data:null,error:null}),
    supabase.from("representative_profiles").select("phone").eq("email",person.email).maybeSingle(),
   ]);
   if(commercialResult.error)throw commercialResult.error;
   if(publicResult.error)throw publicResult.error;
   return {commercial:(commercialResult.data as {phone?:string}|null)?.phone??"",public:(publicResult.data as {phone?:string}|null)?.phone??""};
  }
 });
 const phoneInitialized=useRef(false);
 useEffect(()=>{if(!phoneInitialized.current&&phoneSources){if(!person.phone?.trim())setPhone(phoneSources.commercial||phoneSources.public||"");phoneInitialized.current=true;}},[phoneSources,person.phone]);
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
 const [tab,setTab]=useState<PersonFileTabId>("dados");
 const hasLinkedRecord=!!linkedCommercial&&(open||editingPage);
 const linkedRecord=useRepresentativeRecord({name:linkedCommercial?.full_name??"",email:linkedCommercial?.email??"",representativeId:linkedCommercial?.id??"",commercial:true,omitPhone:true,enabled:hasLinkedRecord});

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
  // Validações antes de qualquer gravação, abrindo a aba onde está o problema.
  if(!name.trim()){setTab("dados");toast.error("Informe o nome da pessoa.");return;}
  if(sales&&!territoryInitialized.current&&!territoryEdited.current){setTab("regiao");toast.error("Aguarde o carregamento dos dados regionais antes de salvar.");return;}
  const parsedDdds=role==="Representante"?parseAreaDdds(areaDdds):[];
  if(!parsedDdds){setTab("regiao");toast.error("Informe DDDs de dois dígitos, separados por vírgula.");return;}
  setBusy(true);
  const {error}=await supabase.rpc("admin_set_person" as never,{p_user:person.id,p_role:role,p_active:active,p_uf:uf,p_cities:cities,p_supervisor:supervisor||null} as never);
  if(error){setBusy(false);toast.error("Não foi possível salvar permissões: "+error.message);return;}
  const {error:profileError}=await supabase.rpc("admin_update_person_contact" as never,{p_user:person.id,p_name:name.trim(),p_phone:phone.trim()} as never);
  if(profileError){setBusy(false);toast.error("Permissões salvas, mas nome/telefone não foram confirmados: "+(profileError?.message??"O banco não autorizou a alteração. Verifique as permissões da tabela profiles."));onSaved();return;}
  let contactWarning="";
  if(role==="Representante"&&linkedCommercial?.id){
   const {error:commercialPhoneError}=await supabase.from("commercial_representative_details" as never)
    .upsert({representative_id:linkedCommercial.id,phone:phone.trim()} as never,{onConflict:"representative_id"});
   const {error:publicPhoneError}=await supabase.from("representative_profiles")
    .update({phone:phone.trim()}).eq("email",person.email);
   if(commercialPhoneError||publicPhoneError)contactWarning=" O WhatsApp foi salvo no perfil de acesso, mas não foi possível sincronizar todas as fichas públicas/comerciais.";
   void qc.invalidateQueries({queryKey:["representative-phone-sources",person.id]});
   void qc.invalidateQueries({queryKey:["representative-public-contact"]});
   void qc.invalidateQueries({queryKey:["commercial-representative-details",linkedCommercial.id]});
  }
  let image=effectiveMap.trim();
  if(mapFile){
   const extension=mapFile.name.split(".").pop()?.toLowerCase()||"webp";
   const path=person.id+"/mapa-"+Date.now()+"."+extension;
   const uploaded=await supabase.storage.from("territory-maps").upload(path,mapFile,{contentType:mapFile.type});
   if(uploaded.error){setBusy(false);toast.error("Erro ao enviar mapa: "+uploaded.error.message);return;}
   image=supabase.storage.from("territory-maps").getPublicUrl(path).data.publicUrl;
  }
  const {data:savedTerritory,error:territoryError}=await supabase.from("person_territories" as never).upsert({user_id:person.id,city_base:effectiveCity.trim(),region:effectiveRegion.trim(),map_url:image} as never,{onConflict:"user_id"}).select("user_id").maybeSingle();
  if(territoryError||!savedTerritory){setBusy(false);toast.error("Dados da pessoa salvos, mas região/mapa não foram confirmados: "+(territoryError?.message??"O banco não confirmou a gravação."));onSaved();return;}
  if(role==="Representante"){
   const {error:dddError}=await supabase.from("representative_area_ddds" as never).upsert({representative_id:person.id,ddds:parsedDdds.join(", ")} as never,{onConflict:"representative_id"});
   if(dddError){setBusy(false);toast.error("DDD não foi salvo. Aplique a migração representative_area_ddds no Supabase: "+dddError.message);return;}
   void qc.invalidateQueries({queryKey:["representative-area-ddds",person.id]});
   void qc.invalidateQueries({queryKey:["representative-area-ddds-summary",person.id]});
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
  setBusy(false);
  if(commissionWarning||contactWarning)toast.warning("Pessoa e região salvas. "+commissionWarning+contactWarning);
  else toast.success("Pessoa e região atualizadas.");
  onSaved();setOpen(false);onClose?.();
 }
 return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md sm:p-5">
  <PersonSummary id={person.id} name={person.full_name||"Sem nome"} email={person.email} active={person.access_active} rate={commissionError?"—":commissionData==null?(person.site_role==="Administrador"?"3,5%":"—"):`${Number(commissionData).toLocaleString("pt-BR")}%`} role={person.site_role} phone={person.phone} uf={person.territory_uf} sellerId={person.id} commercialId={linkedCommercial?.id} onEdit={editingPage?undefined:onEdit}/>
  <div className="mt-2 flex justify-end">
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
  {(open||editingPage)&&<PersonFilePanel title="Ficha completa da pessoa" onClose={()=>{setOpen(false);onClose?.();}}>
   <PersonFileTabs label={`Ficha de ${person.full_name||person.email}`} value={tab} onValueChange={setTab} panels={{
    dados:<div className="space-y-4">
     <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <h3 className="mb-3 text-base font-black">Identificação e contato</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
       <label className="block font-bold md:col-span-2">Nome completo<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
       <label className="block font-bold">E-mail de acesso<input type="email" value={person.email} readOnly className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-600"/><span className="mt-1 block text-xs font-normal text-slate-500">Vinculado à conta de login.</span></label>
       <label className="block font-bold">WhatsApp / Telefone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/>{role==="Representante"&&linkedCommercial&&<span className="mt-1 block text-xs font-normal text-slate-500">Ao salvar, também atualiza as fichas comercial e pública do representante.</span>}</label>
      </div>
     </section>
     {hasLinkedRecord&&<RepresentativeRecordFields record={linkedRecord} group="personal" title="Cadastro comercial vinculado — dados pessoais"/>}
    </div>,
    acesso:<div className="space-y-4 text-sm">
     <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-base font-black">Perfil e situação</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
       <label className="block font-bold">Status / perfil<select value={role} onChange={e=>setRole(e.target.value as Role)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{roles.map(r=><option key={r}>{r}</option>)}</select></label>
       <label className="block font-bold">Situação<select value={active?"ativo":"inativo"} onChange={e=>setActive(e.target.value==="ativo")} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
       {role==="Vendedor"&&<label className="block font-bold md:col-span-2">Representante responsável<select value={supervisor} onChange={e=>setSupervisor(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Não vinculado</option>{people.filter(p=>p.id!==person.id&&p.site_role==="Representante").map(p=><option value={p.id} key={p.id}>{p.full_name||p.email}</option>)}</select></label>}
      </div>
     </section>
     <div className="rounded-lg bg-[#eaf2ff] p-3"><strong>Permissões automáticas:</strong> {role==="Visitante"?"Catálogo e preços à vista, sem pedidos.":role==="Administrador"?"Administração, catálogo completo, preços, estoque e pedidos.":role==="Representante"?"Catálogo completo, preços à vista e a prazo, estoque, pedidos e equipe.":"Catálogo completo, preços à vista e a prazo, estoque e pedidos."}</div>
     {ownAccount&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3">Esta é a sua conta administrativa; ela não pode ser excluída por esta tela.</p>}
     <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[#102a52]">Este usuário possui uma conta de acesso. Os dados de contato ficam em Dados pessoais e a área de atuação em Região de atendimento. A ficha comercial complementar só pode ser salva para representantes vinculados ao cadastro comercial.</p>
    </div>,
    comissao:<section className="space-y-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
     <h3 className="text-lg font-black">Comissão individual sobre vendas</h3>
     <label className="block text-sm font-bold">Percentual (%)<select value={commissionRate} onChange={e=>setCommissionRate(e.target.value)} disabled={!sales||commissionError} className="mt-2 min-h-12 w-full rounded-lg border-2 border-amber-400 bg-white px-3 text-base disabled:opacity-60"><option value="">Não definida</option>{[0.5,1,1.5,2,2.5,3,3.5].map(rate=><option key={rate} value={rate}>{rate.toLocaleString("pt-BR")}%</option>)}</select></label>
     {!sales&&<p className="text-sm text-amber-900">Selecione o perfil Vendedor ou Representante na aba Acesso para habilitar a comissão.</p>}
     {role==="Administrador"&&<p className="text-sm text-amber-900">Para o perfil Administrador a comissão é fixada em 3,5%.</p>}
     {commissionError&&<p role="alert" className="text-sm font-bold text-red-700">Não foi possível consultar a comissão. Não salve até corrigir a conexão com o banco.</p>}
     <p className="rounded-lg bg-white/70 p-2 text-sm"><strong>Vendas no mês:</strong> {monthlySales}</p>
     <p className="text-xs text-slate-600">A comissão é salva junto com a ficha da pessoa (permitido: 0,5% a 3,5%).</p>
    </section>,
    carteira:<CustomerPortfolio ownerId={person.id} ownerName={person.full_name||person.email} enabled={tab==="carteira"}/>,
    regiao:<div className="space-y-4">
     {!sales&&<p className="rounded-lg bg-slate-50 p-3 text-sm">A área de atuação fica disponível para os perfis Vendedor, Representante e Administrador (aba Acesso).</p>}
     {sales&&<div className="space-y-3 rounded-xl border border-blue-200 bg-[#f8fbff] p-3">
      <strong>Área de atuação</strong>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
       <label className="block text-sm font-bold">Cidade-base de atuação<input value={effectiveCity} onChange={e=>{territoryEdited.current=true;setCityBase(e.target.value);}} placeholder="Ex.: Sorocaba" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
       {role==="Representante"&&<label className="block text-sm font-bold">DDD(s) da área de atuação<input value={areaDdds} onChange={e=>setAreaDdds(e.target.value)} placeholder="Ex.: 11, 15, 19" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/><span className="text-xs font-normal text-slate-500">Separe múltiplos DDDs por vírgula.</span></label>}
       <label className="block text-sm font-bold">Região de atuação<input value={effectiveRegion} onChange={e=>{territoryEdited.current=true;setRegion(e.target.value);}} placeholder="Ex.: Sorocaba e região, DDD 15" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
       <label className="block text-sm font-bold">Estado(s) — UF<input value={uf} onChange={e=>setUf(e.target.value)} placeholder="Ex.: SP, MG" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
       <label className="block text-sm font-bold md:col-span-2">Cidades atendidas<textarea value={cities} onChange={e=>setCities(e.target.value)} rows={2} placeholder="Ex.: Sorocaba, Itu, Votorantim" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"/></label>
      </div>
      <div className="space-y-2 rounded-lg border border-blue-200 bg-white p-3">
       <strong className="block text-sm">Mapa de imagem da região de atuação</strong>
       <label className="block text-sm font-bold">Enviar imagem (PNG, JPG ou WebP, até 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0]??null;if(file&&file.size>5*1024*1024){toast.error("Limite de 5 MB.");e.target.value="";return;}setMapFile(file);}} className="mt-1 block w-full text-sm"/></label>
       <label className="block text-sm font-bold">Ou endereço da imagem<input value={effectiveMap} onChange={e=>{setMapUrl(e.target.value);setMapFile(null);}} placeholder="/images/territories/mapa.webp" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"/></label>
       {mapFile?<p className="text-xs">Imagem selecionada: {mapFile.name}</p>:effectiveMap?<img src={effectiveMap} alt="Mapa da região de atuação" className="max-h-96 w-full rounded-xl object-contain"/>:/\bGO\b/i.test(uf)?<figure className="overflow-hidden rounded-xl border-2 border-[#d8ac34] bg-white p-1 shadow-md"><img src="/images/territories/mapa-goias.webp" alt="Arte ilustrativa da área de atuação em Goiás, com Goiânia e municípios da região" loading="lazy" className="h-auto w-full object-contain"/><figcaption className="px-2 py-2 text-center text-xs text-slate-600">Referência visual de Goiás. Confirme as cidades atendidas nos campos da ficha.</figcaption></figure>:<p className="text-xs text-slate-600">Sem mapa personalizado.</p>}
      </div>
      {/abdenego|abdnego/i.test(person.full_name+" "+person.email) && <figure className="overflow-hidden rounded-lg border border-blue-200 bg-white p-2"><img src="/images/territories/abdenego.webp" alt="Mapa da área de atuação de Abdenego" className="max-h-80 w-full object-contain"/><figcaption className="mt-1 text-center text-xs">Mapa de atuação cadastrado</figcaption></figure>}
      {/livaldo/i.test(person.full_name+" "+person.email) && <figure className="overflow-hidden rounded-lg border border-blue-200 bg-white p-2"><img src="/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png" alt="Mapa da área de atuação de Livaldo" className="max-h-80 w-full object-contain"/><figcaption className="mt-1 text-center text-xs">Mapa de atuação cadastrado</figcaption></figure>}
      <p className="text-xs text-slate-600">As localidades antigas e os mapas existentes não serão apagados. Estes campos registram a área na ficha da pessoa.</p>
     </div>}
     {hasLinkedRecord&&<RepresentativeRecordFields record={linkedRecord} group="region" title="Cadastro comercial vinculado — região"/>}
    </div>,
   }}/>
   <button type="button" disabled={busy} onClick={()=>void save()} className="mt-4 min-h-12 w-full rounded-lg bg-[#102a52] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?"Salvando…":"Salvar ficha e permissões"}</button>
   {tab==="carteira"&&<p className="mt-2 text-xs text-slate-500">Transferências e atribuições de clientes são gravadas na hora, sem precisar salvar a ficha.</p>}
  </PersonFilePanel>}
 </article>;
}

type CommercialRepresentative = {id:string;user_id?:string|null;full_name:string;email:string;active:boolean};
function RepresentativeCard({representative,monthlySales,onSaved,onEdit,editingPage=false,onClose}:{representative:CommercialRepresentative;monthlySales:string;onSaved:()=>void;onEdit?:(()=>void)|undefined;editingPage?:boolean;onClose?:()=>void}) {
 const [open,setOpen]=useState(editingPage);
 const [tab,setTab]=useState<PersonFileTabId>("dados");
 const record=useRepresentativeRecord({name:representative.full_name,email:representative.email,representativeId:representative.id,commercial:true,enabled:open||editingPage});
 const commercialMap=/abdenego|abdnego/i.test(representative.full_name)?"/images/territories/abdenego.webp":/livaldo/i.test(representative.full_name)?"/Mapa%20de%20Atua%C3%A7%C3%A3o%20de%20Livaldo%20Sorocaba.png":null;
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState(representative.full_name);
 const [email,setEmail]=useState(representative.email);
 const [active,setActive]=useState(representative.active);
 const qc=useQueryClient();
 const [commissionRate,setCommissionRate]=useState("");
 const {data:commercialCommission,error:commissionError,isLoading:commissionLoading}=useQuery({queryKey:["commercial-representative-commission",representative.id],enabled:true,retry:false,queryFn:async()=>{const {data,error}=await supabase.from("commercial_representative_commission_rates" as never).select("rate").eq("representative_id",representative.id).maybeSingle();if(error)throw error;const rate=(data as {rate:number}|null)?.rate;setCommissionRate(rate==null?"":String(rate));return rate ?? null;}});
 async function save(){
  if(!name.trim()||!/^\S+@\S+\.\S+$/.test(email.trim())){setTab("dados");toast.error("Informe nome e e-mail válidos.");return;}
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
 return <article className="rounded-xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
  <PersonSummary id={representative.id} name={representative.full_name} email={representative.email} active={active} rate={commissionError?"—":commercialCommission==null?"—":`${Number(commercialCommission).toLocaleString("pt-BR")}%`} role="Representante" sellerId="" onEdit={editingPage?undefined:onEdit}/>
  <div className="mt-2 flex justify-end">
   <button type="button" disabled={busy} onClick={()=>void remove()} title="Excluir cadastro comercial" aria-label={`Excluir cadastro comercial de ${representative.full_name}`} className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-700 disabled:opacity-40"><Trash2 size={19}/></button>

  </div>
  {(open||editingPage)&&<PersonFilePanel title="Ficha do representante comercial" onClose={()=>{setOpen(false);onClose?.();}}>
   <PersonFileTabs label={`Ficha de ${representative.full_name}`} value={tab} onValueChange={setTab} panels={{
    dados:<div className="space-y-4">
     <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <h3 className="mb-3 text-base font-black">Identificação e contato</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
       <label className="block font-bold">Nome completo<input value={name} onChange={e=>setName(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
       <label className="block font-bold">E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"/></label>
      </div>
     </section>
     <RepresentativeRecordFields record={record} group="personal" title="Dados cadastrais"/>
    </div>,
    acesso:<section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
     <h3 className="text-base font-black">Perfil e situação</h3>
     <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="block font-bold">Status / perfil<select value="Representante" disabled className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-slate-700"><option>Representante</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Cadastro comercial; para mudar o perfil, vincule uma conta de acesso.</span></label>
      <label className="block font-bold">Situação<select value={active?"ativo":"inativo"} onChange={e=>setActive(e.target.value==="ativo")} className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></label>
     </div>
     <p className="text-xs text-slate-600">Este é um cadastro comercial ainda não vinculado à ficha de usuário. Sua exclusão não apaga uma conta Google ou outros registros.</p>
    </section>,
    comissao:<section className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="text-base font-black">Comissão individual sobre vendas</h3><label className="mt-3 block text-sm font-bold">Percentual da comissão<select value={commissionRate} onChange={e=>setCommissionRate(e.target.value)} disabled={!!commissionError||commissionLoading} className="mt-2 min-h-12 w-full rounded-lg border border-amber-400 bg-white px-3 text-base disabled:opacity-60"><option value="">Não definida</option>{[0.5,1,1.5,2,2.5,3,3.5].map(rate=><option key={rate} value={rate}>{rate.toLocaleString("pt-BR")}%</option>)}</select></label>{commissionError&&<p role="alert" className="mt-2 text-sm font-bold text-red-700">Não foi possível consultar a comissão: {commissionError.message}.</p>}<p className="mt-2 text-sm"><strong>Vendas no mês:</strong> {monthlySales}</p></section>,
    carteira:representative.user_id
     ? <CustomerPortfolio ownerId={representative.user_id} ownerName={representative.full_name} enabled={tab==="carteira"}/>
     : <p className="rounded-lg bg-slate-50 p-3 text-sm">Este cadastro comercial ainda não tem conta de acesso vinculada, por isso não possui carteira de clientes. Os clientes só podem ser atribuídos a representantes com conta ativa.</p>,
    regiao:<div className="space-y-4">
     <RepresentativeRecordFields record={record} group="region" title="Região de atuação"/>
     <CommercialAreaDdds representativeId={representative.id}/>
     {commercialMap&&<a href={commercialMap} target="_blank" rel="noreferrer" className="block rounded-lg border border-blue-200 bg-white p-2"><img src={commercialMap} alt={`Mapa de atuação de ${representative.full_name}`} className="max-h-80 w-full object-contain"/><span className="mt-1 block text-center text-xs font-bold">Ampliar mapa de atuação</span></a>}
    </div>,
   }}/>
   <button type="button" disabled={busy} onClick={()=>void save()} className="mt-4 min-h-11 w-full rounded-lg bg-[#102a52] px-4 py-2 font-bold text-white disabled:opacity-50">Salvar ficha e comissão</button>
   <p className="mt-2 text-xs text-slate-500">Este botão grava nome, e-mail, situação e comissão. Dados cadastrais, região e DDDs têm botões próprios nas abas.</p>
  </PersonFilePanel>}
 </article>;
}

/** Moldura da ficha aberta dentro do card, com título e botão de fechar. */
function PersonFilePanel({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
 return <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-[#102a52] shadow-sm sm:p-5">
  <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-black sm:text-xl">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar edição" className="rounded-lg p-2 hover:bg-slate-100"><X size={22}/></button></div>
  {children}
 </div>;
}
