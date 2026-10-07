import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRound, Phone, Mail, BriefcaseBusiness, Store, Truck } from "lucide-react";

const PROFILE_KEY = "netinho-vendedor";
type AccessType = "Vendedor" | "Visitante" | "Distribuidor" | "Auto-Peças";
type SellerProfile = { name: string; phone: string; email: string; accessType: AccessType };

const ACCESS_OPTIONS: { value: AccessType; description: string; icon: typeof BriefcaseBusiness }[] = [
  { value: "Vendedor", description: "Representa clientes e monta pedidos", icon: BriefcaseBusiness },
  { value: "Visitante", description: "Conhece a Netinho e nossa atuação", icon: UserRound },
  { value: "Distribuidor", description: "Conhece nossas soluções comerciais", icon: Truck },
  { value: "Auto-Peças", description: "Conhece nossa linha e atuação", icon: Store },
];

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Netinho Auto Parts" },
      { name: "description", content: "Escolha seu perfil e acesse a Netinho Auto Parts." },
      { property: "og:title", content: "Netinho Auto Parts" },
      { property: "og:description", content: "Catálogo e pedidos para Vendedores, Visitantes, Distribuidores e Auto-Peças." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [accessType, setAccessType] = useState<AccessType | null>(null);
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
        setAccessType(profile.accessType ?? null);
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
    if (!accessType) {
      toast.error("Selecione como você acessará a Netinho.");
      return;
    }
    setBusy(true);
    try {
      const profile: SellerProfile = {
        accessType,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

      // A identificação é local e não depende de autenticação Supabase.
      // Isso mantém o catálogo acessível mesmo quando o projeto não permite sessão anônima.
      navigate({ to: accessType === "Vendedor" ? "/catalogo" : "/" });
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
      <div className="w-full max-w-lg">
        <Logo size="lg" showPhone className="mb-8 justify-center" />
        <form onSubmit={submit} className="surface-card space-y-5 p-6">
          <div>
            <h1 className="mt-1 text-2xl font-bold">Como você acessa a Netinho?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecione seu perfil e informe seus dados.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ACCESS_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = accessType === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setAccessType(option.value)}
                  className={active
                    ? "rounded-xl border-2 border-primary bg-primary/10 p-4 text-left ring-2 ring-primary/20"
                    : "rounded-xl border border-border bg-secondary/40 p-4 text-left hover:border-primary/50"}>
                  <Icon className={active ? "h-6 w-6 text-primary" : "h-6 w-6 text-muted-foreground"} />
                  <span className="mt-3 block font-bold">{option.value}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>

          {accessType && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-semibold text-primary">Perfil selecionado: {accessType}</p>
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
                {busy ? "Entrando..." : accessType === "Vendedor" ? "Entrar no catálogo" : "Conhecer a Netinho"}
              </Button>
            </div>
          )}
        </form>

        <button type="button" onClick={installApp} disabled={installing}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition hover:border-primary/60 hover:bg-primary/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-glow">
            <img src="/__l5e/assets-v1/2aa54efb-02e7-4fcc-addf-bd32fbeeb22e/netinho-icon.webp" alt="Netinho Auto Parts" className="h-full w-full object-contain" />
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
