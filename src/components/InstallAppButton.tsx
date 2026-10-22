import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Smartphone, LoaderCircle, MousePointerClick, Download } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}


function showInstallInstructions() {
  // Installation is controlled by the browser. Avoid showing a misleading download notification.
  toast.info("Abra no Chrome e toque em Instalar aplicativo no menu ⋮.", { duration: 4500 });
}

export interface InstallAppButtonProps extends ComponentProps<typeof Button> {
  label?: string;
  assistantStyle?: boolean;
}

export function InstallAppButton({ className, disabled, label = "Crie um atalho no celular", assistantStyle = false, ...props }: InstallAppButtonProps) {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const syncInstalled = () => setInstalled(standalone.matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
    syncInstalled();
    const capturePrompt = (event: Event) => {
      // The browser owns eligibility; retain its one-use event, never emulate installation.
      if (!("prompt" in event) || typeof event.prompt !== "function" || !("userChoice" in event)) return;
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
    };
    const finishInstall = () => {
      promptRef.current = null;
      setInstalled(true);
      toast.success("Atalho do Netinho adicionado à tela inicial.");
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", finishInstall);
    standalone.addEventListener("change", syncInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", finishInstall);
      standalone.removeEventListener("change", syncInstalled);
      promptRef.current = null;
    };
  }, []);

  function playTap() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(720, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(960, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.16);
      osc.onended = () => void ctx.close();
    } catch { /* Sound is optional. */ }
  }
  async function install() {
    playTap();
    if (installing) return;
    if (installed) { toast.info("O atalho do Netinho já está na tela inicial."); return; }
    setInstalling(true);
    try {
      if (promptRef.current) {
        const pending = promptRef.current;
        promptRef.current = null;
        await pending.prompt();
        const choice = await pending.userChoice;
        if (choice.outcome === "accepted") return;
        return;
      }
      // Abrir o Chrome completo quando o navegador interno não oferece instalação.
      if (/Android/i.test(navigator.userAgent)) {
        const url = window.location.href.replace(/^https?:\/\//, "");
        window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
        return;
      }
      showInstallInstructions();
    } catch {
      showInstallInstructions();
    } finally {
      setInstalling(false);
    }
  }

  return (
    <>
      <Button
        {...props}
        type="button"
        variant="outline"
        disabled={disabled || installing}
        onClick={() => void install()}
        className={cn("h-auto min-h-16 w-full justify-start gap-3 whitespace-normal rounded-lg border-primary/40 bg-primary/10 px-3 py-3 text-left text-foreground hover:bg-primary/20 shadow-md transition-transform duration-300 hover:scale-[1.03] active:scale-95 motion-reduce:transform-none", assistantStyle && "!min-h-24 !flex-col !items-center !justify-center !gap-1.5 !border !border-[#4c9fff] !bg-[#0b294c] !text-white hover:!bg-[#103657] !shadow-[0_0_10px_#148cff55] !px-3 !py-3 !text-center", className)}
      >
        {assistantStyle ? <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden="true"><Smartphone className="h-12 w-12 text-[#54c5ff] drop-shadow-[0_0_8px_#20aaff]" strokeWidth={1.7} /><Download className="absolute left-[20px] top-[15px] h-4 w-4 text-white" strokeWidth={2.5} /><MousePointerClick className="absolute -bottom-1 -right-1 h-7 w-7 rotate-[-18deg] text-[#ffd34f] drop-shadow-[0_0_5px_#facc15]" strokeWidth={2.1} /></span> : <LogoMark className="h-14 w-14 shrink-0" />}
        {assistantStyle ? <span className="text-center text-xs leading-5"><span className="block">Quer um acesso mais rápido?</span><strong className="block text-sm text-white">Baixe este atalho em seu celular.</strong></span> : <span className="min-w-0 flex-1 text-sm font-semibold leading-5">{label}</span>}
        {installing ? <LoaderCircle className="shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : assistantStyle ? null : <Smartphone className="shrink-0 text-primary" aria-hidden="true" />}
      </Button>

    </>
  );
}
