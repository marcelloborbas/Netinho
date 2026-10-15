import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRound, Phone, Mail, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar, type AccessType } from "@/components/ProfileAvatar";

const PROFILE_KEY = "netinho-vendedor";
const REPRESENTATIVES = [
  { id: "abdenego-eugenio", name: "Abdenego Eugênio", region: "Vale do Paraíba e Litoral Norte", path: "/representante" },
  { id: "livaldo-souza-silva", name: "Livaldo Souza Silva", region: "Todo o Brasil · Teste", path: "/representante-livaldo" },
] as const;
type SellerProfile = { name: string; phone: string; email: string; accessType: AccessType };

const ACCESS_OPTIONS: { value: AccessType; description: string }[] = [
  { value: "Representante Comercial", description: "Atende clientes e monta pedidos" },
  { value: "Visitante", description: "Conhece a Netinho e nossa atuação" },
  { value: "Distribuidor", description: "Conhece nossas soluções comerciais" },
  { value: "Auto-Peças", description: "Conhece nossa linha e atuação" },
];

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Netinho Auto Parts" },
      { name: "description", content: "Escolha seu perfil e acesse a Netinho Auto Parts." },
      { property: "og:title", content: "Netinho Auto Parts" },
      { property: "og:description", content: "Catálogo e pedidos para Representantes Comerciais, Visitantes, Distribuidores e Auto-Peças." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { data: me } = useQuery(meQuery);
  const [accessType, setAccessType] = useState<AccessType | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedRepresentative, setSelectedRepresentative] = useState("");
  const [password, setPassword] = useState("");
  const [installing, setInstalling] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        const profile = JSON.parse(saved) as SellerProfile;
        setAccessType(profile.accessType === "Vendedor" ? "Representante Comercial" : (profile.accessType ?? null));
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
      if (accessType === "Representante Comercial") {
        const rep = REPRESENTATIVES.find((r) => r.id === selectedRepresentative);
        if (!rep) { toast.error("Selecione um representante cadastrado."); return; }
        if (!email.trim() || !password) { toast.error("Informe e-mail e senha para autenticar."); return; }
        const auth = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (auth.error || !auth.data.user) { toast.error("E-mail ou senha inválidos."); return; }
        const result = await supabase.from("commercial_representatives" as never).select("full_name,active,user_id").eq("user_id", auth.data.user.id).maybeSingle();
        const record = result.data as { full_name: string; active: boolean; user_id: string } | null;
        if (result.error || !record?.active || record.full_name.toLocaleLowerCase("pt-BR") !== rep.name.toLocaleLowerCase("pt-BR")) {
          await supabase.auth.signOut();
          setAccessType("Visitante"); setName(""); setPassword("");
          toast.error("Representante não autorizado. Continue como Visitante.");
          return;
        }
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ accessType, name: record.full_name, phone: "", email: email.trim().toLowerCase() }));
        navigate({ to: "/catalogo" });
        return;
      }
      const profile: SellerProfile = {
        accessType,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

      // A identificação é local e não depende de autenticação Supabase.
      // Isso mantém o catálogo acessível mesmo quando o projeto não permite sessão anônima.
      navigate({ to: accessType === "Representante Comercial" ? "/catalogo" : "/" });
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
            <h1 className="mt-1 text-2xl font-bold">Qual seu perfil ?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecione seu perfil e informe seus dados.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ACCESS_OPTIONS.map((option) => {
              const active = accessType === option.value;
              return (
                <button key={option.value} type="button" onClick={() => setAccessType(option.value)}
                  className={active
                    ? "rounded-xl border-2 border-primary bg-primary/10 p-4 text-left ring-2 ring-primary/20"
                    : "rounded-xl border border-border bg-secondary/40 p-4 text-left hover:border-primary/50"}>
                  <ProfileAvatar type={option.value} className={active ? "h-12 w-12" : "h-12 w-12 opacity-70"} />
                  <span className="mt-3 block font-bold">{option.value}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.description}</span>
                </button>
              );
            })}
          </div>

          {accessType === "Representante Comercial" && (
            <div className="space-y-4 rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-transparent p-4 sm:p-5">
              <p className="text-center text-lg font-extrabold tracking-wide text-amber-400">Representantes Comerciais</p>
              {REPRESENTATIVES.map(rep => (
                <div key={rep.id} className="flex items-stretch gap-2">
                <button key={rep.id} type="button" onClick={() => { setSelectedRepresentative(rep.id); setEmail(""); setPassword(""); }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border-2 border-amber-400/40 bg-background/70 px-4 py-5 text-left shadow-sm transition hover:border-amber-400 hover:bg-amber-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
                  <span><span className="block font-display text-2xl font-black leading-tight tracking-wide text-amber-400 sm:text-3xl">{rep.name}</span>
                    <span className="mt-2 block text-sm text-muted-foreground">{rep.region}</span></span>
                  <span className="shrink-0 text-2xl font-bold text-amber-400">→</span>
                </button>
                {me?.isAdmin && <button type="button" title={`Editar ${rep.name} (somente administrador)`} aria-label={`Editar ${rep.name}`} onClick={() => navigate({ to: "/admin", hash: "representantes" })} className="rounded-xl border border-amber-400/50 px-3 text-amber-400 hover:bg-amber-400/10"><Pencil className="h-5 w-5" /></button>}
                </div>
              ))}
              {selectedRepresentative && (
                <div className="space-y-3 rounded-xl border border-amber-400/40 bg-background/80 p-4">
                  <p className="text-lg font-bold text-amber-400">{REPRESENTATIVES.find(rep => rep.id === selectedRepresentative)?.name}</p>
                  <p className="text-sm text-muted-foreground">Para acessar a página de vendas, confirme seu e-mail e senha de representante autorizado.</p>
                  <Label htmlFor="representative-email">E-mail</Label>
                  <Input id="representative-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                  <Label htmlFor="representative-password">Senha</Label>
                  <Input id="representative-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
                  <Button type="submit" disabled={busy} className="h-12 w-full bg-gradient-red font-bold">{busy ? "Verificando..." : "Acessar página de vendas →"}</Button>
                  {REPRESENTATIVES.filter(rep => rep.id === selectedRepresentative).map(rep => (
                    <button key={rep.id} type="button" onClick={() => navigate({ to: rep.path })} className="w-full text-center text-sm font-semibold text-amber-400 underline">Ver cadastro e mapa de atuação</button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">O acesso comercial requer autenticação e autorização da administração.</p>
            </div>
          )}
          {accessType && accessType !== "Representante Comercial" && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-semibold text-primary">Perfil selecionado: {accessType}</p>
              {accessType === "Representante Comercial" && (
                <div className="space-y-2">
                  <Label htmlFor="representative">Selecione seu nome</Label>
                  <select id="representative" required value={selectedRepresentative} onChange={(e) => setSelectedRepresentative(e.target.value)} className="h-12 w-full rounded-lg border bg-background px-3 text-foreground">
                    <option value="">Escolha um representante</option>
                    {REPRESENTATIVES.map((rep) => <option key={rep.id} value={rep.id}>{rep.name} — {rep.region}</option>)}
                  </select>
                  {selectedRepresentative && <button type="button" onClick={() => navigate({ to: "/representante" })} className="w-full rounded-lg border border-primary/40 bg-primary/10 p-3 text-left text-sm font-semibold text-primary">Ver dados cadastrados e mapa de atuação →</button>}
                  <p className="text-xs text-muted-foreground">Representantes precisam confirmar sua identidade com e-mail e senha. O cadastro e a autorização são feitos pelo administrador.</p>
                </div>
              )}
              {accessType !== "Representante Comercial" && <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center gap-2"><UserRound className="h-4 w-4" />Nome</Label>
                <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" className="h-12" />
              </div>}
              {accessType !== "Representante Comercial" && <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" />Telefone</Label>
                <Input id="phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="h-12" />
              </div>}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4" />E-mail</Label>
                <Input id="email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className="h-12" />
              </div>
              {accessType === "Representante Comercial" && <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" /></div>}
              <Button type="submit" disabled={busy} className="h-12 w-full bg-gradient-red text-base font-semibold shadow-glow">
                {busy ? "Entrando..." : accessType === "Representante Comercial" ? "Autenticar representante" : "Conhecer a Netinho"}
              </Button>
            </div>
          )}
        </form>

        <button type="button" onClick={installApp} disabled={installing}
          className="mt-6 flex w-full items-center gap-4 rounded-2xl border-2 border-primary/40 bg-primary/10 px-5 py-5 text-left shadow-sm transition hover:border-primary/70 hover:bg-primary/15 sm:px-6 sm:py-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-glow sm:h-20 sm:w-20">
            <img src="/__l5e/assets-v1/2aa54efb-02e7-4fcc-addf-bd32fbeeb22e/netinho-icon.webp" alt="Netinho Auto Parts" className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold leading-snug text-foreground sm:text-xl">{installing ? "Instalando..." : "Colocar Netinho no celular"}</span>
            <span className="mt-2 block text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">{canInstall ? "Adicionar o ícone Netinho Auto Parts à tela inicial" : "Adicionar à tela inicial pelo navegador"}</span>
          </span>
        </button>
        <p className="mx-auto mt-5 max-w-md text-center text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
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
