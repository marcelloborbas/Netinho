import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, UserRound, Phone, Mail, Smartphone } from "lucide-react";

const PROFILE_KEY = "netinho-vendedor";
type SellerProfile = { name: string; phone: string; email: string };

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso – Netinho Auto Parts" },
      { name: "description", content: "Identificação do vendedor para acessar o catálogo Netinho Auto Parts." },
      { property: "og:title", content: "Netinho Auto Parts" },
      { property: "og:description", content: "Acesso do vendedor ao catálogo e pedidos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        const profile = JSON.parse(saved) as SellerProfile;
        setName(profile.name ?? "");
        setPhone(profile.phone ?? "");
        setEmail(profile.email ?? "");
      } catch {
        localStorage.removeItem(PROFILE_KEY);
      }
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    const onInstalled = () => {
      setInstalling(false);
      setCanInstall(false);
      setDeferredPrompt(null);
      toast.success("Netinho Auto Parts instalado no celular.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const profile: SellerProfile = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.signInAnonymously();
      await supabase.auth.updateUser({
        data: { full_name: profile.name, phone: profile.phone, email_contact: profile.email },
      }).catch(() => undefined);

      navigate({ to: "/catalogo" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function installApp() {
    if (!deferredPrompt) {
      toast.info("No celular, use o menu do navegador e escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.");
      return;
    }
    setInstalling(true);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setInstalling(false);
    setDeferredPrompt(null);
    setCanInstall(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <Logo size="lg" showPhone className="mb-8 justify-center" />
        <form onSubmit={submit} className="surface-card space-y-4 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Acesso do vendedor</p>
            <h1 className="mt-1 text-2xl font-bold">Seus dados</h1>
            <p className="mt-1 text-sm text-muted-foreground">Informe seus dados para acessar o catálogo e montar seus pedidos.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="flex items-center gap-2"><UserRound className="h-4 w-4" />Nome</Label>
            <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" className="h-12" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" />Telefone</Label>
            <Input id="phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-12" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4" />E-mail</Label>
            <Input id="email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className="h-12" />
          </div>

          <Button type="submit" disabled={busy} className="h-12 w-full bg-gradient-red text-base font-semibold shadow-glow">
            {busy ? "Entrando..." : "Entrar no catálogo"}
          </Button>
        </form>

        <button type="button" onClick={installApp} disabled={installing}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition hover:border-primary/60 hover:bg-primary/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            {canInstall ? <Download className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{installing ? "Instalando..." : "Colocar Netinho no celular"}</span>
            <span className="block text-xs text-muted-foreground">{canInstall ? "Adicionar o ícone Netinho Auto Parts à tela inicial" : "Adicionar à tela inicial pelo navegador"}</span>
          </span>
        </button>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          O ícone abre o site oficial. Atualizações de catálogo e dados publicados pela Netinho ficam disponíveis automaticamente.
        </p>
      </div>
    </main>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
