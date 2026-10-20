import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Smartphone, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallAppButtonProps extends ComponentProps<typeof Button> {
  label?: string;
}

export function InstallAppButton({ className, disabled, label = "Crie um atalho no celular", ...props }: InstallAppButtonProps) {
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
      // Embedded Android browsers often block installation. Try to open the site in Chrome
      // from the user's click, where the native add-to-home-screen action is available.
      const ua = navigator.userAgent;
      const android = /Android/i.test(ua);
      const embedded = /; wv\)|\bwv\b|Instagram|FBAN|FBAV|WhatsApp|GSA|EdgA/i.test(ua) ||
        (android && !/Chrome\/\d+/i.test(ua));
      if (android && embedded) {
        const url = new URL(window.location.origin + "/auth");
        const intent = "intent://" + url.host + url.pathname +
          "#Intent;scheme=https;package=com.android.chrome;" +
          "S.browser_fallback_url=" + encodeURIComponent(url.href) + ";end";
        window.location.href = intent;
        return;
      }
      toast.info(android
        ? "No menu ⋮ do navegador, toque em “Adicionar à tela inicial”."
        : "No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.");
    } catch {
      toast.info("Use a opção “Adicionar à tela inicial” no menu do navegador.");
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
        {installing ? <LoaderCircle className="shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <Smartphone className="shrink-0 text-primary" aria-hidden="true" />}
      </Button>

    </>
  );
}
