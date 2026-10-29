import { useLiaHighlight } from "@/lib/useLiaHighlight";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { accessQuery } from "@/lib/access";
import { useRouterState } from "@tanstack/react-router";
import { X, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";
import { createPortal } from "react-dom";

const hints = [
  { match: /^\/(auth|login)(\/|$)/, title: "COMO ACESSAR O SITE", message: "Bem-vindo à Netinho Auto Parts!\n\nÉ um prazer ter você aqui conosco!\n\nPara entrar, clique no ícone do Google ou no envelope para receber seu acesso por e-mail.\n\nQuer praticidade? Clique em Baixar App e acesse direto pelo celular!\n\nSempre que precisar de ajuda, clique na sua foto e selecione a opção de Ajuda. Estarei aqui para te orientar!\n\nQue Deus abençoe seu dia e seus negócios!" },
  { match: /^\/$/, title: "Escolha seu perfil", message: "Visitante: consulta informações públicas. Vendedor: atende seus clientes e pedidos. Representante: acompanha sua equipe. Administrador: gerencia o sistema. Para acessar perfis avançados, clique em Solicitar acesso abaixo do perfil desejado. Aguarde a liberação pelo administrador." },
  { match: /catalogo|catálogo/, title: "AJUDA - CATÁLOGO DE PEÇAS", message: "Bem-vindo ao Catálogo Virtual de Peças da Netinho Auto Parts!\n\nVamos lá! Encontrar sua peça nunca foi tão fácil!\n\nClique na lupa e pesquise pelo nome, marca ou o modelo do veículo.\n\nSe preferir, utilize os filtros!\n\nComece selecionando um catálogo, depois a categoria, e em seguida, selecione a marca e o modelo do veículo.\n\nAs quantidades de peças disponíveis aparecem logo abaixo de cada opção.\n\nEncontrou a peça? Clique no carrinho de compras para ir à página de pedidos!\n\nReparou a tarja vermelha? Ela mostra os itens selecionados e o valor total do seu pedido.\n\nViu como é prático?\n\nAgora é com você! Boas vendas!" },
  { match: /clientes/, title: "Clientes", message: "Busque o cliente antes de cadastrar. Vendedores acessam sua carteira; representantes acompanham sua equipe, conforme autorização." },
  { match: /pedidos/, title: "Pedidos", message: "Consulte seus pedidos e acompanhe o andamento. A edição depende do seu perfil e das permissões concedidas." },
  { match: /pedido|vendas/, title: "AJUDA - FAZER PEDIDO", message: "Chegou a hora de concluir seu pedido!\n\nPrimeiro, selecione o cliente. Se não estiver cadastrado, clique em Novo Cliente!\n\nSelecionado o cliente, agora escolha a condição de pagamento. Veja que ao alterar a forma de pagamento, o valor é atualizado!\n\nNa tarja vermelha, você acompanha os itens e o total do pedido.\n\nPrecisa alterar algo? Você pode editar ou continuar comprando!\n\nTudo certinho? Clique em Enviar! O pedido seguirá para a Netinho, com uma cópia para seu e-mail.\n\nFicou alguma dúvida? Fale com nossas atendentes pelo WhatsApp!\n\nBoas vendas e que Deus abençoe seu dia!" },
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
  const [boundaryIndex, setBoundaryIndex] = useState<number | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
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
  const greeting = pathname === "/" ? "Aqui, te mostrarei como tudo funciona!\n\nTá vendo sua foto lá em cima? Clicando nela você consulta seu perfil, pede ajuda ou sai da conta.\n\nPara realizar vendas, você precisa ter status de Vendedor ou Representante.\n\nAqui você também acompanha nossas novidades e campanhas promocionais!\n\nE no menu abaixo, são os atalhos para acesso rápido!\n\nViu? É tudo bem simples e prático!" : hint?.message ?? "Use as opções desta página conforme as permissões do seu perfil. Se precisar de acesso adicional, solicite ao administrador.";
  const speechRefLatest = useRef<() => void>(() => {});
  const speak = () => {
    const audioPath = isAuth ? "/audio/lia/lia-login.mp3?v=20261029-2" : pathname === "/" ? "/audio/lia/lia-inicial.mp3?v=20261029-5" : /catalogo|catálogo/.test(pathname) ? "/audio/lia/lia-catalogo.mp3?v=20261029-3" : /pedido|vendas/.test(pathname) ? "/audio/lia/lia-vender-novo.mp3?v=20261029" : null;
    // Parar qualquer locução anterior antes de iniciar a orientação desta página.
    loginAudioRef.current?.pause();
    loginAudioRef.current = null;
    window.speechSynthesis?.cancel();
    speechRef.current = null;
    setSpeaking(false);
    setBoundaryIndex(null);
    setActiveAudio(null);
    const readText = () => {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.lang = "pt-BR";
      utterance.rate = 0.94;
      const voice = window.speechSynthesis.getVoices().find(v => /^pt-BR$/i.test(v.lang) && /fem|maria|luciana|francisca/i.test(v.name))
        ?? window.speechSynthesis.getVoices().find(v => /^pt/i.test(v.lang));
      if (voice) utterance.voice = voice;
      utterance.onboundary = (event) => { if (speechRef.current === utterance) setBoundaryIndex(event.charIndex); };
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
    setActiveAudio(audio);
    audio.onended = () => { if (loginAudioRef.current === audio) setSpeaking(false); };
    audio.onerror = () => { if (loginAudioRef.current === audio) { loginAudioRef.current = null; readText(); } };
    void audio.play().then(() => {
      if (loginAudioRef.current === audio) setSpeaking(true);
    }).catch(() => {
      if (loginAudioRef.current === audio) { loginAudioRef.current = null; readText(); }
    });
  };
  const highlighted = useLiaHighlight(greeting, speaking, activeAudio, boundaryIndex);
  const highlightedText = highlighted.map(part => <span key={part.key} className={part.highlighted ? "lia-spoken-word lia-spoken-word-active" : "lia-spoken-word"}>{part.text}</span>);
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
    {open && (isAuth ? <div className="netinho-assistant-panel" role="dialog" aria-label="Ajuda da LIA">
      <div className="netinho-assistant-head"><strong className={isAuth ? "text-[#facc15] uppercase" : ""}>{isAuth ? "COMO ACESSAR O SITE" : (hint?.title ?? "Ajuda")}</strong><div>
        <button type="button" aria-label={speaking ? "Parar leitura da página" : "Ouvir orientação desta página"} title={speaking ? "Parar leitura" : "Ouvir orientação"} onClick={() => { if (speaking) { loginAudioRef.current?.pause(); loginAudioRef.current = null; window.speechSynthesis?.cancel(); speechRef.current = null; setSpeaking(false); } else speak(); }}>{speaking ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
        <button type="button" aria-label="Fechar ajuda" onClick={() => { loginAudioRef.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false); setOpen(false); }}><X size={18}/></button>
      </div></div>
      {isAuth ? <div className="space-y-4 text-[21px] leading-[1.9] font-semibold"><p className="lia-speech-text whitespace-pre-line">{highlightedText}</p><InstallAppButton assistantStyle label="Baixar atalho" /><button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-[#102a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d467b]" onClick={() => { setOpen(true); speak(); }} aria-label="Rever o texto e ouvir novamente a locução da LIA"><RotateCcw size={16} /> Rever ajuda</button></div> : <div className="space-y-3">
        <p className="lia-speech-text whitespace-pre-line">{highlightedText}</p>
        <button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-[#102a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d467b]" onClick={speak} aria-label="Rever a ajuda e ouvir novamente a LIA"><RotateCcw size={16} /> Rever ajuda</button>
      </div>}
    </div> : createPortal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#071c37]/65 px-4 py-6" role="presentation">
        <div className="w-full max-w-[440px] max-h-[80dvh] overflow-y-auto rounded-2xl border-2 border-[#d4af37] bg-[#061c35] p-4 text-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Ajuda da LIA">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/20 pb-2">
            <strong className="text-base font-extrabold uppercase">{pathname === "/" ? "AJUDA - PÁGINA INICIAL" : (hint?.title ?? "Ajuda")}</strong>
            <button type="button" aria-label="Fechar ajuda" className="rounded-lg bg-[#153a60] p-2" onClick={() => { loginAudioRef.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false); setOpen(false); }}><X size={20}/></button>
          </div>
          <p className="lia-speech-text whitespace-pre-line">{highlightedText}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#1687d9] px-4 text-sm font-bold text-white" onClick={speak}><RotateCcw size={17}/> Rever ajuda</button>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/40 px-4 text-sm font-bold" onClick={() => { if (speaking) { loginAudioRef.current?.pause(); window.speechSynthesis?.cancel(); setSpeaking(false); } else speak(); }}>{speaking ? <VolumeX size={17}/> : <Volume2 size={17}/>} {speaking ? "Parar áudio" : "Ouvir áudio"}</button>
          </div>
        </div>
      </div>, document.body
    ))}
    {isAuth && <button type="button" className="netinho-assistant-avatar netinho-assistant-avatar-large" aria-label={open ? "Fechar assistente LIA" : "Abrir ajuda da LIA"} aria-expanded={open} onPointerDown={fixedAtFooter ? undefined : onDragStart} onPointerMove={fixedAtFooter ? undefined : onDragMove} onPointerUp={fixedAtFooter ? undefined : onDragEnd} onPointerCancel={fixedAtFooter ? undefined : (event) => { onDragEnd(event); }} onClick={() => { if (ignoreClickRef.current) { ignoreClickRef.current = false; return; } if (open) { loginAudioRef.current?.pause(); loginAudioRef.current = null; window.speechSynthesis?.cancel(); speechRef.current = null; setSpeaking(false); setOpen(false); } else { setOpen(true); speak(); } }}>
      <img src="/images/Mascote%20LIA%20ajuda.webp" alt="Mascote LIA" width="118" height="118" decoding="async" />
    </button>}
  </aside>;
}
