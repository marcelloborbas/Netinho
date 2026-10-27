import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
import { useRouterState } from "@tanstack/react-router";
import { X, Volume2, VolumeX } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const hints = [
  { match: /^\/(auth|login)(\/|$)/, title: "COMO ACESSAR O SITE", message: "Olá! Seja muito bem-vindo!\n\nÉ uma imensa alegria em ter você conosco!\n\nEntre com sua conta do Google ou clique no envelope para receber seu link por e-mail.\n\nQuer praticidade? Baixe o atalho, aguarde a instalação e acesse pelo ícone na tela do seu celular.\n\nConte comigo para ajudar você em cada etapa!\n\nE não se esqueça:\n\nJesus te ama! Que Deus o abençoe em sua caminhada!" },
  { match: /^\/$/, title: "Escolha seu perfil", message: "Visitante: consulta informações públicas. Vendedor: atende seus clientes e pedidos. Representante: acompanha sua equipe. Administrador: gerencia o sistema. Para acessar perfis avançados, clique em Solicitar acesso abaixo do perfil desejado. Aguarde a liberação pelo administrador." },
  { match: /catalogo|catálogo/, title: "", message: "Bem-vindo ao nosso Catálogo Virtual de Peças!\n\nClique na lupa e encontre sua peça pela marca, modelo do veículo ou nome.\n\nPode também pesquisar pelas categorias!\n\nEm Filtros, organize. Para limpar, clique no botão ao lado!\n\nÉ simples e prático!\n\nAgora é só encontrar as peças e fazer boas vendas! Boa sorte!" },
  { match: /clientes/, title: "Clientes", message: "Busque o cliente antes de cadastrar. Vendedores acessam sua carteira; representantes acompanham sua equipe, conforme autorização." },
  { match: /pedidos/, title: "Pedidos", message: "Consulte seus pedidos e acompanhe o andamento. A edição depende do seu perfil e das permissões concedidas." },
  { match: /pedido|vendas/, title: "LIA - Fazer Pedido", message: "Chegou a hora de fazer seu pedido!\n\nSelecione o cliente! Caso não esteja na seleção, clique em Novo Cliente!\n\nInforme a forma de atendimento: Venda ou Orçamento.\n\nEscolha as peças, ajuste as quantidades e confira os valores!\n\nSe precisar de mais produtos, é só clicar em Continuar Comprando!\n\nConfira os dados do cliente, escolha a condição de pagamento e finalize seu pedido!" },
  { match: /ofertas|promoc/, title: "Promoções", message: "Confira o código e a aplicação da peça. Toque em Comprar para continuar, caso tenha autorização para vendas." },
  { match: /admin/, title: "Administração", message: "Gerencie usuários, permissões e operações conforme seu acesso de administrador." },
  { match: /representante|vendedores/, title: "Representantes", message: "Informe sua cidade e estado para localizar o representante que atende sua região." },
  { match: /distribuidoras/, title: "Distribuidoras", message: "Consulte as distribuidoras disponíveis e suas informações autorizadas." },
  { match: /transportadoras/, title: "Transportadoras", message: "Consulte as transportadoras cadastradas e os dados disponíveis para seu perfil." },
];

export function NetinhoAssistant() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: access } = useQuery({ ...accessQuery, enabled: pathname === "/" });
  const isAuth = /^\/(auth|login)(\/|$)/.test(pathname);
  const fixedAtFooter = isAuth || pathname === "/";
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null);
  const ignoreClickRef = useRef(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("netinho-lia-position");
      if (saved) {
        const value = JSON.parse(saved);
        if (Number.isFinite(value.x) && Number.isFinite(value.y)) setPosition({ x: Math.max(10, Math.min(90, value.x)), y: Math.max(10, Math.min(90, value.y)) });
      }
    } catch { /* posição padrão */ }
  }, []);
  const onDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = position?.x ?? ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const y = position?.y ?? ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    dragRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    drag.moved = true;
    const halfX = Math.min(45, (event.currentTarget.offsetWidth / 2 + 8) / window.innerWidth * 100);
    const halfY = Math.min(45, (event.currentTarget.offsetHeight / 2 + 8) / window.innerHeight * 100);
    setPosition({ x: Math.max(halfX, Math.min(100 - halfX, drag.x + dx / window.innerWidth * 100)), y: Math.max(halfY, Math.min(100 - halfY, drag.y + dy / window.innerHeight * 100)) });
  };
  const onDragEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) {
      ignoreClickRef.current = true;
      const halfX = Math.min(45, (event.currentTarget.offsetWidth / 2 + 8) / window.innerWidth * 100);
      const halfY = Math.min(45, (event.currentTarget.offsetHeight / 2 + 8) / window.innerHeight * 100);
      const finalPosition = {
        x: Math.max(halfX, Math.min(100 - halfX, drag.x + (event.clientX - drag.startX) / window.innerWidth * 100)),
        y: Math.max(halfY, Math.min(100 - halfY, drag.y + (event.clientY - drag.startY) / window.innerHeight * 100)),
      };
      setPosition(finalPosition);
      try { window.localStorage.setItem("netinho-lia-position", JSON.stringify(finalPosition)); } catch { /* armazenamento indisponível */ }
    }
    dragRef.current = null;
  };
  const [open, setOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const loginAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    window.speechSynthesis?.cancel();
    loginAudioRef.current?.pause();
    loginAudioRef.current = null;
    speechRef.current = null;
    setSpeaking(false);
    setOpen(false);
    return () => { window.speechSynthesis?.cancel(); loginAudioRef.current?.pause(); };
  }, [pathname, isAuth]);
  if (/^\/callback(\/|$)/.test(pathname)) return null;
  const hint = hints.find((item) => item.match.test(pathname));
  const greeting = pathname === "/" ? "Vamos lá! Aqui é tudo bem facinho!\n\nNo menu superior, clique na sua foto para consultar seu perfil, visualizar suas informações ou sair da conta.\n\nLembre-se: somente perfis autorizados podem realizar vendas!\n\nNesta página, você também acompanha nossas novidades e atualizações!\n\nNo menu inferior, estão seus atalhos rápidos:\n\nInício, Catálogo de Peças, Vender, Pedidos e Sair.\n\nNão disse que era simples? Agora é só vender!" : hint?.message ?? "Use as opções desta página conforme as permissões do seu perfil. Se precisar de acesso adicional, solicite ao administrador.";
  const speak = () => {
    if (isAuth || pathname === "/" || /catalogo|catálogo/.test(pathname) || /pedido|vendas/.test(pathname)) {
      const audio = loginAudioRef.current ?? new Audio(isAuth ? "/audio/lia/lia-login.mp3" : pathname === "/" ? "/audio/lia/lia-inicio.mp3" : /catalogo|catálogo/.test(pathname) ? "/audio/lia/lia-pagina%20catalogo.mp3" : "/audio/lia/lia-vender.mp3");
      loginAudioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => { setSpeaking(false); if (pathname === "/" || /catalogo|catálogo/.test(pathname) || /pedido|vendas/.test(pathname)) { window.speechSynthesis?.cancel(); const utterance = new SpeechSynthesisUtterance(greeting); utterance.lang = "pt-BR"; utterance.rate = 0.94; window.speechSynthesis?.speak(utterance); } };
      if (speaking) { audio.pause(); audio.currentTime = 0; setSpeaking(false); return; }
      audio.currentTime = 0;
      void audio.play().then(() => setSpeaking(true)).catch(() => setSpeaking(false));
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speechRef.current) { speechRef.current = null; setSpeaking(false); return; }
    const textToRead = greeting;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "pt-BR";
    utterance.rate = 0.94;
    utterance.pitch = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /^pt/i.test(v.lang) && /male|masculin|daniel|ricardo|antonio|antônio|felipe|paulo|carlos|francisco/i.test(v.name)) ?? voices.find(v => /^pt/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeaking(false); } };
    utterance.onerror = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeaking(false); } };
    speechRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  };
  return <aside className={`netinho-assistant${isAuth ? " netinho-assistant-auth" : ""}${pathname === "/" ? " netinho-assistant-home" : ""}${position && !fixedAtFooter ? " netinho-assistant-moved" : ""}`} style={position && !fixedAtFooter ? ({ "--lia-x": `${position.x}%`, "--lia-y": `${position.y}%` } as CSSProperties) : undefined} aria-label="Assistente de navegação LIA">
    {open && <div className="netinho-assistant-panel" role="dialog" aria-label="Ajuda da LIA">
      <div className="netinho-assistant-head"><strong className={isAuth ? "text-[#facc15] uppercase" : ""}>{isAuth ? "COMO ACESSAR O SITE" : (hint?.title ?? "Ajuda")}</strong><div>
        <button type="button" aria-label={speaking ? "Parar leitura da página" : "Ouvir orientação desta página"} title={speaking ? "Parar leitura" : "Ouvir orientação"} onClick={speak}>{speaking ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => { loginAudioRef.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false); setOpen(false); }}><X size={18}/></button>
      </div></div>
      {isAuth ? <div className="space-y-3 text-sm leading-relaxed"><p className="whitespace-pre-line">{greeting}</p><InstallAppButton assistantStyle label="Baixar atalho" /></div> : <p className="whitespace-pre-line">{greeting}</p>}
    </div>}
    <button type="button" className="netinho-assistant-avatar netinho-assistant-avatar-large" aria-label={open ? "Fechar assistente LIA" : "Abrir ajuda da LIA"} aria-expanded={open} onPointerDown={fixedAtFooter ? undefined : onDragStart} onPointerMove={fixedAtFooter ? undefined : onDragMove} onPointerUp={fixedAtFooter ? undefined : onDragEnd} onPointerCancel={fixedAtFooter ? undefined : (event) => { onDragEnd(event); }} onClick={() => { if (ignoreClickRef.current) { ignoreClickRef.current = false; return; } setOpen(!open); }}>
      <img src="/images/Mascote%20LIA%20ajuda.webp" alt="Mascote LIA" width="118" height="118" />
    </button>
  </aside>;
}
