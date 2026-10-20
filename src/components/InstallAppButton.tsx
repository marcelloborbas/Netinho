import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallAppButtonProps extends ComponentProps<typeof Button> {
  label?: string;
}

export function InstallAppButton({ className, disabled, label = "Baixe para seu celular a Netinho", ...props }: InstallAppButtonProps) {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setPlatform(ios ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "desktop");
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
      setInstructions(false);
      toast.success("Netinho adicionada à tela inicial.");
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
    if (installed || !promptRef.current) {
      setInstructions(true);
      return;
    }
    const pendingPrompt = promptRef.current;
    promptRef.current = null;
    setInstalling(true);
    try {
      await pendingPrompt.prompt();
      const choice = await pendingPrompt.userChoice;
      if (choice.outcome === "dismissed") setInstructions(true);
    } catch {
      setInstructions(true);
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
        className={cn("h-auto min-h-16 w-full justify-start gap-3 whitespace-normal rounded-lg border-primary/40 bg-primary/10 px-3 py-3 text-left text-foreground hover:bg-primary/20 shadow-md transition-transform duration-300 hover:scale-[1.03] active:scale-95 motion-reduce:transform-none", className)}
      >
        <LogoMark className="h-10 w-10 shrink-0" />
        <span className="min-w-0 flex-1 text-sm font-semibold leading-5">{label}</span>
        {installing ? <LoaderCircle className="shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <Download className="shrink-0 text-primary" aria-hidden="true" />}
      </Button>
      <Dialog open={instructions} onOpenChange={setInstructions}>
        <DialogContent className="max-h-[85svh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>{installed ? "Netinho no seu celular" : "Adicionar Netinho à tela inicial"}</DialogTitle>
            <DialogDescription>
              {installed ? "A Netinho já está instalada neste aparelho. Abra pelo ícone na tela inicial." : "Abra o site diretamente no navegador do celular e siga os passos abaixo."}
            </DialogDescription>
          </DialogHeader>
          {!installed && (
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-foreground">
              {platform === "ios" ? (
                <>
                  <li>Abra a Netinho no Safari.</li>
                  <li>Toque em Compartilhar (quadrado com seta para cima).</li>
                  <li>Selecione “Adicionar à Tela de Início” e confirme em “Adicionar”.</li>
                </>
              ) : platform === "android" ? (
                <>
                  <li>Abra a Netinho no Chrome.</li>
                  <li>Toque no menu de três pontos.</li>
                  <li>Selecione “Instalar aplicativo” ou “Adicionar à tela inicial” e confirme.</li>
                </>
              ) : (
                <>
                  <li>No celular, abra o site da Netinho no Chrome (Android) ou Safari (iPhone).</li>
                  <li>No Android, use o menu de três pontos e “Instalar aplicativo” ou “Adicionar à tela inicial”.</li>
                  <li>No iPhone, use Compartilhar e “Adicionar à Tela de Início”.</li>
                </>
              )}
            </ol>
          )}
          <Button type="button" onClick={() => setInstructions(false)}>Entendi</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
