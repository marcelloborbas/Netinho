import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, X, Search, ShoppingCart, Users, ClipboardList, Home, Volume2, VolumeX } from "lucide-react";

const hints = [
  { match: /catalogo|catálogo/, title: "Catálogo", message: "Encontre peças pelo código ou escolha uma categoria.", icon: Search },
  { match: /clientes/, title: "Clientes", message: "Consulte ou cadastre seus clientes por aqui.", icon: Users },
  { match: /pedido|vendas/, title: "Pedidos", message: "Escolha o cliente, confira as peças e revise seu pedido.", icon: ClipboardList },
  { match: /ofertas|promoc/, title: "Ofertas", message: "Veja as ofertas e selecione uma peça para fazer seu pedido.", icon: ShoppingCart },
];
const links = [
  { to: "/" as const, label: "Início", icon: Home },
  { to: "/catalogo" as const, label: "Buscar peças", icon: Search },
  { to: "/clientes" as const, label: "Clientes", icon: Users },
  { to: "/pedidos" as const, label: "Pedidos", icon: ClipboardList },
];
export function NetinhoAssistant() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sound, setSound] = useState(false);
  if (/^\/(auth|login|callback)(\/|$)/.test(pathname) || hidden) return null;
  const hint = hints.find((item) => item.match.test(pathname));
  const greeting = hint?.message ?? "Olá! Sou o Netinho. Posso ajudar você a navegar?";
  const speak = () => {
    if (!sound || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(greeting);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };
  return <aside className="netinho-assistant" aria-label="Assistente de navegação Netinho">
    {open && <div className="netinho-assistant-panel" role="dialog" aria-label="Ajuda do Netinho">
      <div className="netinho-assistant-head"><strong>Netinho • Seu guia de peças</strong><div>
        <button type="button" aria-label={sound ? "Desativar voz" : "Ativar voz"} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => setOpen(false)}><X size={18}/></button>
      </div></div>
      <p>{greeting}</p><p className="netinho-assistant-help">Escolha abaixo para onde deseja ir. Estou aqui para facilitar sua navegação!</p>
      <div className="netinho-assistant-links">{links.map(({to,label,icon:Icon}) => <Link key={to} to={to} onClick={() => setOpen(false)}><Icon size={17}/>{label}</Link>)}</div>
      <button className="netinho-assistant-hide" type="button" onClick={() => {setOpen(false);setHidden(true);}}>Ocultar assistente nesta visita</button>
    </div>}
    <button type="button" className="netinho-assistant-avatar" aria-label={open ? "Fechar assistente Netinho" : "Abrir assistente Netinho"} aria-expanded={open} onClick={() => {setOpen(!open); if (!open) speak();}}>
      <img src="/images/Mascote%20Netinho%20Auto%20Parts%20com%20Chat.webp" alt="" width="72" height="72" />
      <span aria-hidden="true"><MessageCircle size={13}/></span>
    </button>
  </aside>;
}
