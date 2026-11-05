import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";

const pages = [
 {to:"/admin-gestao",label:"Painel Administrativo"},
 {to:"/pessoas",label:"Pessoas e Comissões"},
 {to:"/pedidos",label:"Pedidos"},
 {to:"/clientes",label:"Clientes"},
 {to:"/vendedores",label:"Vendedores"},
 {to:"/distribuidoras",label:"Distribuidoras"},
] as const;

export function AdminPageNavigation(){
 const {data:me}=useQuery(meQuery);
 const path=useRouterState({select:s=>s.location.pathname});
 if(!me?.isAdmin)return null;
 const index=pages.findIndex(p=>p.to===path || (p.to==="/pedidos"&&path.startsWith("/pedidos/")));
 if(index<0)return null;
 const previous=pages[index-1];
 const next=pages[index+1];
 return <nav aria-label="Navegação entre páginas administrativas" className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border border-[#d6b45b]/60 bg-white/95 px-3 py-2 text-[#102a52] shadow-sm">
  {previous?<Link to={previous.to} aria-label={`Voltar para ${previous.label}`} title={previous.label} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d8e1ed] bg-[#f5f8fc] px-3 text-xs font-bold transition hover:bg-[#e5eef9]"><ChevronLeft size={19}/><span>Voltar</span></Link>:<span className="min-w-20"/>}
  <span className="min-w-0 flex-1 truncate text-center text-[11px] font-bold text-slate-600">{index+1} / {pages.length}</span>
  {next?<Link to={next.to} aria-label={`Avançar para ${next.label}`} title={next.label} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#d8b14a] bg-[#102a52] px-3 text-xs font-bold text-white transition hover:bg-[#204a7a]"><span>Avançar</span><ChevronRight size={19} className="text-[#f5ce68]"/></Link>:<span className="min-w-20"/>}
 </nav>;
}
