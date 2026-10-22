import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X, Volume2, VolumeX } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const hints = [
  { match: /^\/(auth|login)(\/|$)/, title: "COMO ACESSAR O SITE", message: "Entre pelo G do Google ou pelo envelope para receber um link no seu e-mail." },
  { match: /^\/$/, title: "Escolha seu perfil", message: "Visitante: consulta informações públicas. Vendedor: atende seus clientes e pedidos. Representante: acompanha sua equipe. Administrador: gerencia o sistema. Para usar perfis avançados, solicite autorização pelo botão da página inicial." },
  { match: /catalogo|catálogo/, title: "Catálogo", message: "Pesquise pelo código, peça ou veículo. Abra o item para conferir os detalhes. Preços e pedidos exigem perfil autorizado." },
  { match: /clientes/, title: "Clientes", message: "Busque o cliente antes de cadastrar. Vendedores acessam sua carteira; representantes acompanham sua equipe, conforme autorização." },
  { match: /pedidos/, title: "Pedidos", message: "Consulte seus pedidos e acompanhe o andamento. A edição depende do seu perfil e das permissões concedidas." },
  { match: /pedido|vendas/, title: "Vendas", message: "Selecione o cliente, confira as peças e quantidades e revise antes de enviar. É necessário ter acesso comercial autorizado." },
  { match: /ofertas|promoc/, title: "Promoções", message: "Confira o código e a aplicação da peça. Toque em Comprar para continuar, caso tenha autorização para vendas." },
  { match: /admin/, title: "Administração", message: "Gerencie usuários, permissões e operações conforme seu acesso de administrador." },
  { match: /representante|vendedores/, title: "Representantes", message: "Consulte os vendedores vinculados à sua equipe e acompanhe seus resultados, conforme suas permissões." },
  { match: /distribuidoras/, title: "Distribuidoras", message: "Consulte as distribuidoras disponíveis e suas informações autorizadas." },
  { match: /transportadoras/, title: "Transportadoras", message: "Consulte as transportadoras cadastradas e os dados disponíveis para seu perfil." },
];

export function NetinhoAssistant() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuth = /^\/(auth|login)(\/|$)/.test(pathname);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    if (isAuth) setOpen(true);
    else setOpen(false);
  }, [isAuth]);
  if (/^\/callback(\/|$)/.test(pathname)) return null;
  const hint = hints.find((item) => item.match.test(pathname));
  const greeting = hint?.message ?? "Use as opções desta página conforme as permissões do seu perfil. Se precisar de acesso adicional, solicite ao administrador.";
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
      <div className="netinho-assistant-head"><strong className={isAuth ? "text-[#facc15] uppercase" : ""}>{isAuth ? "COMO ACESSAR O SITE" : `Netinho • ${hint?.title ?? "Seu guia"}`}</strong><div>
        <button type="button" aria-label={sound ? "Desativar voz" : "Ativar voz"} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => setOpen(false)}><X size={18}/></button>
      </div></div>
      <p>{greeting}</p>
      {hint?.tips && hint.tips.length > 0 && <ul className="netinho-assistant-tips">{hint.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>}
      {isAuth && <div className="mt-3 space-y-2"><p className="text-xs text-blue-100">Quer um acesso mais rápido? Crie um atalho para abrir o Netinho pelo celular.</p><InstallAppButton label="Baixar atalho" className="min-h-12 !bg-[#eaf2ff] !text-[#102a52] !px-2 !py-1" /></div>}
      <button className="netinho-assistant-hide" type="button" onClick={() => setOpen(false)}>Entendi, fechar ajuda</button>
    </div>}
    <button type="button" className="netinho-assistant-avatar" aria-label={open ? "Fechar assistente Netinho" : "Abrir ajuda do Netinho"} aria-expanded={open} onClick={() => {setOpen(!open); if (!open) speak();}}>
      <img src="/images/Mascote%20Netinho%20Auto%20Parts%20com%20Chat.webp" alt="Mascote Netinho" width="84" height="84" />
    </button>
  </aside>;
}
