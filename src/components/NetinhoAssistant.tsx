import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { X, Volume2, VolumeX } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const hints = [
  { match: /^\/(auth|login)(\/|$)/, title: "COMO ACESSAR O SITE", message: "Entre pelo G do Google ou pelo envelope para receber um link no seu e-mail." },
  { match: /^\/$/, title: "Escolha seu perfil", message: "Visitante: consulta informações públicas. Vendedor: atende seus clientes e pedidos. Representante: acompanha sua equipe. Administrador: gerencia o sistema. Para acessar perfis avançados, clique em Solicitar acesso abaixo do perfil desejado. Aguarde a liberação pelo administrador." },
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
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setOpen(false);
    return () => window.speechSynthesis?.cancel();
  }, [pathname, isAuth]);
  if (/^\/callback(\/|$)/.test(pathname)) return null;
  const hint = hints.find((item) => item.match.test(pathname));
  const greeting = hint?.message ?? "Use as opções desta página conforme as permissões do seu perfil. Se precisar de acesso adicional, solicite ao administrador.";
  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const pageText = document.querySelector("main")?.textContent?.replace(/\s+/g, " ").trim();
    const textToRead = `${greeting}${pageText ? ". Conteúdo desta página: " + pageText : ""}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "pt-BR";
    utterance.rate = 0.94;
    utterance.pitch = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /^pt/i.test(v.lang) && /male|masculin|daniel|ricardo|antonio|felipe|paulo|carlos/i.test(v.name)) ?? voices.find(v => /^pt/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };
  return <aside className={`netinho-assistant${isAuth ? " netinho-assistant-auth" : ""}`} aria-label="Assistente de navegação Netinho">
    {open && <div className="netinho-assistant-panel" role="dialog" aria-label="Ajuda do Netinho">
      <div className="netinho-assistant-head"><strong className={isAuth ? "text-[#facc15] uppercase" : ""}>{isAuth ? "COMO ACESSAR O SITE" : (hint?.title ?? "Ajuda")}</strong><div>
        <button type="button" aria-label={speaking ? "Parar leitura da página" : "Ouvir orientação desta página"} title={speaking ? "Parar leitura" : "Ouvir orientação"} onClick={speak}>{speaking ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => setOpen(false)}><X size={18}/></button>
      </div></div>
      <p>{greeting}</p>
      {hint?.tips && hint.tips.length > 0 && <ul className="netinho-assistant-tips">{hint.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>}
      {isAuth && <div className="mt-3 space-y-2"><p className="text-xs text-blue-100">Quer um acesso mais rápido? Crie um atalho para abrir o Netinho pelo celular.</p><InstallAppButton label="Baixar atalho" assistantStyle /></div>}
    </div>}
    <button type="button" className="netinho-assistant-avatar" aria-label={open ? "Fechar assistente Netinho" : "Abrir ajuda do Netinho"} aria-expanded={open} onClick={() => setOpen(!open)}>
      <img src="/images/Mascote%20Netinho%20Auto%20Parts%20com%20Chat.webp" alt="Mascote Netinho" width="84" height="84" />
    </button>
    <span className="netinho-assistant-caption"><strong>Oi, sou o LIVA</strong><small>Vou te ajudar!</small></span>
  </aside>;
}
