import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { meQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageNavigation } from "@/components/AdminPageNavigation";
import { ClipboardList, UserRound } from "lucide-react";
import { brl } from "@/lib/brand";

export const Route=createFileRoute("/_authenticated/admin-pedidos")({
  staticData: { sitemap: false },
 component:AdminOrders,
 head:()=>({meta:[{title:"Pedidos administrativos | Netinho Auto Parts"}]})
});

function AdminOrders(){
 const {data:me,isLoading:loadingMe}=useQuery(meQuery);
 const [selected,setSelected]=useState("todos");
 const {data:users=[],isLoading:loadingUsers}=useQuery({queryKey:["admin-orders-users"],enabled:!!me?.isAdmin,queryFn:async()=>{
  const {data,error}=await supabase.from("profiles").select("id,full_name,email").order("full_name");
  if(error)throw error;return data??[];
 }});
 const {data:orders=[],isLoading:loadingOrders,error:ordersError}=useQuery({queryKey:["admin-all-orders"],enabled:!!me?.isAdmin,queryFn:async()=>{
  const all: Array<{id:string;seller_id:string|null;number:number;created_at:string;total:number|null;status:string;kind:string;customer_snapshot:unknown}>=[];
  for(let from=0;;from+=500){
   const {data,error}=await supabase.from("orders").select("id,seller_id,number,created_at,total,status,kind,customer_snapshot").order("created_at",{ascending:false}).range(from,from+499);
   if(error)throw error;all.push(...(data??[]));
   if(!data||data.length<500)break;
  }
  return all;
 }});
 if(loadingMe)return <p className="p-5">Carregando…</p>;
 if(!me?.isAdmin)return <p className="p-5">Acesso restrito ao administrador.</p>;
 const visible=orders.filter(o=>selected==="todos"||o.seller_id===selected);
 const sum=visible.filter(o=>o.kind!=="orcamento"&&o.status!=="cancelled").reduce((n,o)=>n+Number(o.total??0),0);
 const userName=(id:string|null)=>users.find(u=>u.id===id)?.full_name||users.find(u=>u.id===id)?.email||(id?"Usuário não identificado":"Sem usuário");
 return <main className="mx-auto w-full max-w-4xl space-y-4 px-3 py-5 pb-28 text-[#102a52]">
  <AdminPageNavigation/>
  <header className="rounded-2xl border-2 border-[#d4af37] bg-[#102a52] px-5 py-6 text-center text-white"><h1 className="text-2xl font-black">Pedidos — Administração</h1></header>
  <section className="rounded-2xl border bg-white p-4 shadow-sm">
   <label className="block text-sm font-bold">Usuário
    <select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3">
     <option value="todos">Todos os usuários</option>
     {users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.email}</option>)}
    </select>
   </label>
   <div className="mt-4 rounded-xl bg-[#102a52] px-4 py-3 text-white"><div className="text-xs font-bold">Total dos pedidos selecionados (sem cancelamentos e orçamentos)</div><div className="text-2xl font-black text-[#f9d875]">{brl(sum)}</div></div>
  </section>
  {(loadingUsers||loadingOrders)&&<p className="p-4">Carregando pedidos…</p>}
  {ordersError&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">Não foi possível consultar os pedidos. Verifique as permissões administrativas do banco.</p>}
  {!loadingOrders&&!ordersError&&visible.length===0&&<p className="rounded-xl bg-white p-4">Nenhum pedido encontrado para este usuário.</p>}
  <div className="space-y-3">{visible.map(o=><article key={o.id} className="rounded-2xl border border-[#d8b45a] bg-white p-4 shadow-sm">
   <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold"><UserRound size={18}/>{userName(o.seller_id)}</div><p className="mt-1 text-xs text-slate-600">Pedido nº {o.number} · {new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.kind==="orcamento"?"Orçamento":"Pedido"}</p></div><span className="rounded-lg bg-[#e9f0f8] px-2 py-1 text-xs font-bold">{o.status}</span></div>
   <div className="mt-3 flex items-center justify-between gap-3"><strong className="text-lg">{brl(Number(o.total??0))}</strong><Link to="/pedidos/$id" params={{id:o.id}} className="inline-flex items-center gap-2 rounded-xl bg-[#102a52] px-3 py-2 text-sm font-bold text-white"><ClipboardList size={17}/>Ver pedido</Link></div>
  </article>)}</div>
 </main>;
}
