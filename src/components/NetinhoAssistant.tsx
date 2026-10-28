import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
import { useRouterState } from "@tanstack/react-router";
import { X, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";

const hints = [
  { match: /^\/(auth|login)(\/|$)/, title: "COMO ACESSAR O SITE", message: "Olá! Seja muito bem-vindo à Netinho Auto Parts!\n\nÉ uma imensa alegria em tê-lo conosco!\n\nPara acessar o APP, entre com sua conta do Google clicando na letra G.\n\nSe sua conta não for do Google, clique no envelope, insira seu e-mail e aguarde para receber seu link no e-mail que você indicou.\n\nVou te dar uma dica genial!\n\nPraticidade! Você pode baixar o APP clicando no atalho abaixo e aguarde um pouco para a instalação.\n\nPronto! Agora você pode acessar pelo ícone instalado na tela do seu celular. Isso deixará você logado automaticamente.\n\nE tem mais: conte comigo para ajudar você em cada etapa. Clique em seu ícone no cabeçalho da página e depois em Ajuda!\n\nE não se esqueça:\n\nJesus te ama! Que Deus o abençoe em sua caminhada!" },
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
  const fixedAtFooter = true;
  const [footerOffset, setFooterOffset] = useState(66);
  useEffect(() => {
    if (isAuth) return;
    const footer = document.querySelector<HTMLElement>(".mobile-nav");
    if (!footer) return;
    const update = () => setFooterOffset(Math.max(0, window.innerHeight - footer.getBoundingClientRect().top));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update); };
  }, [pathname, isAuth]);
  const [coverOffset, setCoverOffset] = useState<number | null>(null);
  useEffect(() => {
    if (pathname !== "/") { setCoverOffset(null); return; }
    const cover = document.querySelector<HTMLElement>(".home-cover-anchor");
    if (!cover) return;
    const update = () => setCoverOffset(window.innerHeight - cover.getBoundingClientRect().bottom);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(cover);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update); };
  }, [pathname]);
  const [loginCoverOffset, setLoginCoverOffset] = useState(0);
  useEffect(() => {
    if (!isAuth) return;
    const update = () => {
      const cover = document.querySelector<HTMLElement>(".welcome-auth-stage .welcome-art-frame");
      if (cover) setLoginCoverOffset(window.innerHeight - cover.getBoundingClientRect().bottom);
    };
    update();
    const observer = new ResizeObserver(update);
    const cover = document.querySelector<HTMLElement>(".welcome-auth-stage .welcome-art-frame");
    if (cover) observer.observe(cover);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update); };
  }, [isAuth]);
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
  const greeting = pathname === "/" ? "Vamos lá! Vou te mostrar como tudo funciona facinho por aqui!\n\nClicando na sua foto lá em cima, você pode ver seu status, seu cadastro, a Ajuda, ou sair da conta.\n\nSaiba que para fazer vendas, você precisa ter autorização, status de Representante ou Vendedor.\n\nNeste espaço, você poderá acompanhar todas as novidades da Netinho Auto Parts!\n\nE olha só! No menu abaixo, você encontra os atalhos rápidos que agilizam sua navegação.\n\nNão disse que é fácil mesmo? Agora é com você! Boas vendas!" : hint?.message ?? "Use as opções desta página conforme as permissões do seu perfil. Se precisar de acesso adicional, solicite ao administrador.";
  const speechRefLatest = useRef<() => void>(() => {});
  const speak = () => {
    const audioPath = isAuth ? "/audio/lia/lia-login.mp3" : pathname === "/" ? "/audio/lia/lia-inicio.mp3?v=3" : /catalogo|catálogo/.test(pathname) ? "/audio/lia/lia-pagina%20catalogo.mp3" : /pedido|vendas/.test(pathname) ? "/audio/lia/lia-vender.mp3" : null;
    // Parar qualquer locução anterior antes de iniciar a orientação desta página.
    loginAudioRef.current?.pause();
    loginAudioRef.current = null;
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setSpeaking(false);
    const readText = () => {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.lang = "pt-BR";
      utterance.rate = 0.94;
      const voice = window.speechSynthesis.getVoices().find(v => /^pt-BR$/i.test(v.lang) && /fem|maria|luciana|francisca/i.test(v.name))
        ?? window.speechSynthesis.getVoices().find(v => /^pt/i.test(v.lang));
      if (voice) utterance.voice = voice;
      utterance.onend = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeaking(false); } };
      utterance.onerror = () => { if (speechRef.current === utterance) { speechRef.current = null; setSpeaking(false); } };
      speechRef.current = utterance;
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    };
    if (!audioPath) { readText(); return; }
    const audio = new Audio(audioPath);
    loginAudioRef.current = audio;
    audio.onended = () => { if (loginAudioRef.current === audio) setSpeaking(false); };
    audio.onerror = () => { if (loginAudioRef.current === audio) { loginAudioRef.current = null; readText(); } };
    void audio.play().then(() => {
      if (loginAudioRef.current === audio) setSpeaking(true);
    }).catch(() => {
      if (loginAudioRef.current === audio) { loginAudioRef.current = null; readText(); }
    });
  };
  speechRefLatest.current = speak;
  useEffect(() => {
    if (isAuth) return;
    const showHelp = () => {
      setOpen(true);
      speechRefLatest.current();
    };
    window.addEventListener("netinho:lia-help", showHelp);
    return () => window.removeEventListener("netinho:lia-help", showHelp);
  }, [isAuth]);
  return <aside className={`netinho-assistant${!isAuth ? " netinho-assistant-menu-help" : ""}${/catalogo|catálogo/.test(pathname) ? " netinho-assistant-catalog" : ""}${isAuth ? " netinho-assistant-auth" : ""}${pathname === "/" ? " netinho-assistant-home" : ""}${position && !fixedAtFooter ? " netinho-assistant-moved" : ""}`} style={({ "--lia-footer-offset": `${footerOffset}px`, "--lia-cover-offset": `${coverOffset ?? footerOffset}px`, "--lia-login-cover-offset": `${loginCoverOffset}px` } as CSSProperties)} aria-label="Assistente de navegação LIA">
    {open && <div className="netinho-assistant-panel" role="dialog" aria-label="Ajuda da LIA">
      <div className="netinho-assistant-head"><strong className={isAuth ? "text-[#facc15] uppercase" : ""}>{isAuth ? "COMO ACESSAR O SITE" : (hint?.title ?? "Ajuda")}</strong><div>
        <button type="button" aria-label={speaking ? "Parar leitura da página" : "Ouvir orientação desta página"} title={speaking ? "Parar leitura" : "Ouvir orientação"} onClick={() => { if (speaking) { loginAudioRef.current?.pause(); loginAudioRef.current = null; window.speechSynthesis?.cancel(); speechRef.current = null; setSpeaking(false); } else speak(); }}>{speaking ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => { loginAudioRef.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false); setOpen(false); }}><X size={18}/></button>
      </div></div>
      {isAuth ? <div className="space-y-3 text-sm leading-relaxed"><p className="whitespace-pre-line">{greeting}</p><InstallAppButton assistantStyle label="Baixar atalho" /><button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-[#102a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d467b]" onClick={() => { setOpen(true); speak(); }} aria-label="Rever o texto e ouvir novamente a locução da LIA"><RotateCcw size={16} /> Rever ajuda</button></div> : <div className="space-y-3">
        <p className="whitespace-pre-line">{greeting}</p>
        <button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-[#102a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d467b]" onClick={speak} aria-label="Rever a ajuda e ouvir novamente a LIA"><RotateCcw size={16} /> Rever ajuda</button>
      </div>}
    </div>}
    {isAuth && <button type="button" className="netinho-assistant-avatar netinho-assistant-avatar-large" aria-label={open ? "Fechar assistente LIA" : "Abrir ajuda da LIA"} aria-expanded={open} onPointerDown={fixedAtFooter ? undefined : onDragStart} onPointerMove={fixedAtFooter ? undefined : onDragMove} onPointerUp={fixedAtFooter ? undefined : onDragEnd} onPointerCancel={fixedAtFooter ? undefined : (event) => { onDragEnd(event); }} onClick={() => { if (ignoreClickRef.current) { ignoreClickRef.current = false; return; } if (open) { loginAudioRef.current?.pause(); loginAudioRef.current = null; window.speechSynthesis?.cancel(); speechRef.current = null; setSpeaking(false); setOpen(false); } else { setOpen(true); speak(); } }}>
      <img src="/images/Mascote%20LIA%20ajuda.webp" alt="Mascote LIA" width="118" height="118" decoding="async" />
    </button>}
  </aside>;
}
