import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, X, Search, ShoppingCart, Users, ClipboardList, Home, Volume2, VolumeX } from "lucide-react";

const hints = [
  { match: /^\\/(auth|login)(\\/|$)/, title: "Como entrar", message: "Bem-vindo! Se você tem uma conta Google (Gmail), toque no G colorido e escolha sua conta. Se prefere outro e-mail, toque no envelope, digite seu endereço e solicite o link de acesso. Depois, confira sua caixa de entrada e o spam.", tips: ["G colorido: entrar com sua conta Google.", "Envelope: receber um link de acesso no seu e-mail.", "Se não receber o link, confira o spam e verifique o endereço digitado."] },
  { match: /catalogo|catálogo/, title: "Catálogo de peças", message: "Digite o código, nome da peça ou veículo na busca. Selecione a categoria, abra os detalhes para conferir a aplicação e use Fazer pedido para escolher a peça.", tips: ["Use a busca para localizar uma peça.", "Confira aplicação, estoque e preço antes de pedir."] },
  { match: /clientes/, title: "Clientes", message: "Procure o cliente pelo nome ou cadastro. Se não encontrar, use a opção de cadastrar novo cliente. Confira os dados antes de salvar.", tips: ["Pesquise antes de cadastrar para evitar duplicidade.", "Confira nome, documento e contato."] },
  { match: /pedido|vendas/, title: "Fazer pedido", message: "Primeiro escolha o cliente. Depois selecione as peças e quantidades, confira as condições de pagamento e revise o pedido antes de enviar.", tips: ["Selecione o cliente para começar.", "Revise produtos, quantidades e valores antes de finalizar."] },
  { match: /ofertas|promoc/, title: "Promoções", message: "Encontre a peça da campanha, confira a aplicação e toque em Comprar. Na página de vendas, selecione o cliente e revise seu pedido.", tips: ["Confira o código e a aplicação da peça.", "Toque em Comprar para continuar o pedido."] },
  { match: /admin|representante/, title: "Administração", message: "Nesta área você pode consultar suas opções de administração ou representação, conforme suas permissões. Escolha uma função para continuar.", tips: ["Use os menus disponíveis para sua conta.", "Se faltar uma opção, confira suas permissões com o administrador."] },
  { match: /^\\/$|inicio|home/, title: "Página inicial", message: "Bem-vindo à Netinho Auto Parts! Escolha Catálogo para encontrar peças, Clientes para consultar cadastros ou Pedidos para acompanhar compras.", tips: ["Catálogo: encontre peças e preços disponíveis.", "Pedidos: acompanhe e revise seus pedidos."] },
];
const links = [
  { to: "/" as const, label: "Início", icon: Home },
  { to: "/catalogo" as const, label: "Buscar peças", icon: Search },
  { to: "/clientes" as const, label: "Clientes", icon: Users },
  { to: "/pedidos" as const, label: "Pedidos", icon: ClipboardList },
];
export function NetinhoAssistant() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuth = /^\\/(auth|login)(\\/|$)/.test(pathname);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    if (isAuth) setOpen(true);
    else setOpen(false);
  }, [isAuth]);
  if (/^\\/callback(\\/|$)/.test(pathname) || hidden) return null;
  const hint = hints.find((item) => item.match.test(pathname));
  const greeting = hint?.message ?? "Olá! Sou o Netinho. Posso ajudar você a navegar? Use o menu inferior para escolher uma página.";
  const speak = () => {
    if (!sound || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(greeting);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };
  return <aside className={`netinho-assistant${isAuth ? " netinho-assistant-auth" : ""}`} aria-label="Assistente de navegação Netinho">
    {open && <div className="netinho-assistant-panel" role="dialog" aria-label="Ajuda do Netinho">
      <div className="netinho-assistant-head"><strong>Netinho • {hint?.title ?? "Seu guia"}</strong><div>
        <button type="button" aria-label={sound ? "Desativar voz" : "Ativar voz"} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => setOpen(false)}><X size={18}/></button>
      </div></div>
      <p>{greeting}</p>
      {hint?.tips && <ul className="netinho-assistant-tips">{hint.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>}
      {!isAuth && <><p className="netinho-assistant-help">Escolha uma página para continuar:</p>
      <div className="netinho-assistant-links">{links.map(({to,label,icon:Icon}) => <Link key={to} to={to} onClick={() => setOpen(false)}><Icon size={17}/>{label}</Link>)}</div></>}
      <button className="netinho-assistant-hide" type="button" onClick={() => {setOpen(false);setHidden(true);}}>Ocultar assistente nesta visita</button>
    </div>}
    <button type="button" className="netinho-assistant-avatar" aria-label={open ? "Fechar assistente Netinho" : "Abrir ajuda do Netinho"} aria-expanded={open} onClick={() => {setOpen(!open); if (!open) speak();}}>
      <img src="/images/Mascote%20Netinho%20Auto%20Parts%20com%20Chat.webp" alt="Mascote Netinho" width="84" height="84" />
    </button>
  </aside>;
}
