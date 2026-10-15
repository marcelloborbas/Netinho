import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalling(false);
      toast.success("Netinho Auto Parts instalado no celular.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      toast.info("No celular, use o menu do navegador e escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.");
      return;
    }
    setInstalling(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      toast.info("Não foi possível instalar agora. Use “Adicionar à tela inicial” no menu do navegador.");
    } finally {
      setInstalling(false);
      setPromptEvent(null);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void install()} disabled={installing}
      className="group mt-6 flex h-auto w-full items-center justify-start gap-4 whitespace-normal rounded-2xl border-2 border-primary/40 bg-primary/10 px-5 py-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/70 hover:bg-primary/15 active:scale-[0.97] motion-reduce:transform-none sm:px-6 sm:py-6">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-transparent shadow-glow transition-transform duration-300 group-hover:scale-110 group-active:rotate-[-8deg] motion-reduce:transform-none sm:h-20 sm:w-20">
        <img src="/favicon.png" alt="Netinho Auto Parts" className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-extrabold leading-snug text-foreground sm:text-xl">{installing ? "Instalando..." : "Colocar Netinho no celular"}</span>
        <span className="mt-2 block text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">{promptEvent ? "Adicionar o ícone Netinho Auto Parts à tela inicial" : "Adicionar à tela inicial pelo navegador"}</span>
      </span>
    </Button>
  );
}