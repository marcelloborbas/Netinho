import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
type Request = { id:string; applicant_type:string; form_data:Record<string,string>; status:string; created_at:string };
const statuses = ["recebido","em_analise","pendente","aprovado","recusado"];
export const Route = createFileRoute("/cadastros-pendentes")({component: CadastrosPendentes,ssr:false,staticData:{sitemap:false}});
function CadastrosPendentes(){
 const [admin,setAdmin]=useState(false),[loading,setLoading]=useState(true),[rows,setRows]=useState<Request[]>([]),[error,setError]=useState("");
 const load=async()=>{
  setLoading(true);setError("");
  try{
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){setError("Faça login para acessar.");return;}
   const {data:allowed,error:checkError}=await supabase.rpc("is_admin" as never);
   if(checkError||allowed!==true){setError("Acesso exclusivo do administrador.");return;}
   setAdmin(true);
   const {data,error:fetchError}=await supabase.from("registration_requests" as never).select("id,applicant_type,form_data,status,created_at").order("created_at",{ascending:false});
   if(fetchError)throw fetchError;
   setRows((data||[]) as Request[]);
  }catch{setError("Não foi possível consultar as solicitações.");}finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);
 const update=async(id:string,status:string)=>{
  const {error}=await supabase.rpc("review_registration_request" as never, {p_request_id:id,p_status:status} as never);
  if(error){setError("Não foi possível alterar o status.");return;}
  setRows(old=>old.map(x=>x.id===id?{...x,status}:x));
 };
 return <main className="min-h-screen bg-slate-50 p-4 text-slate-900"><div className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow-lg">
  <Link to="/" className="text-blue-900 underline">Voltar ao início</Link>
  <h1 className="my-5 text-2xl font-bold text-blue-950">Cadastros recebidos</h1>
  {loading&&<p>Verificando acesso e carregando...</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}
  {admin&&!loading&&<><button onClick={()=>void load()} className="mb-4 rounded-lg bg-blue-950 px-4 py-2 text-white">Atualizar</button>
  {!rows.length&&<p>Nenhuma solicitação recebida.</p>}
  {rows.map(r=><article key={r.id} className="mb-4 rounded-xl border p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><strong>{r.form_data["razao_social"]||"Solicitante"}</strong><span className="text-sm">{r.applicant_type} • {new Date(r.created_at).toLocaleDateString("pt-BR")}</span></div>
   <p className="my-2 break-all text-xs text-slate-500">Protocolo: {r.id}</p>
   <details><summary className="cursor-pointer font-semibold">Ver dados enviados</summary><dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(r.form_data).map(([k,v])=><div key={k} className="break-words text-sm"><dt className="font-semibold">{k.replaceAll("_"," ")}</dt><dd>{String(v)}</dd></div>)}</dl></details>
   <label className="mt-4 block text-sm font-semibold">Situação
    <select value={r.status} onChange={e=>void update(r.id,e.target.value)} className="mt-1 block w-full rounded-lg border p-2">{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select>
   </label>
   <p className="mt-2 text-xs text-slate-500">A aprovação libera o perfil correspondente para acesso. Comissões e demais condições comerciais são definidas separadamente pelo Administrador.</p>
  </article>)}</>}
 </div></main>;
}