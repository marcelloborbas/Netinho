import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar – NETINHO Representações" },
      { name: "description", content: "Acesso dos representantes ao sistema de pedidos NETINHO." },
      { property: "og:title", content: "Entrar – NETINHO Representações" },
      { property: "og:description", content: "Acesso dos representantes ao sistema de pedidos NETINHO." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/" }); });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cadastro criado! Confirme pelo link enviado ao seu e-mail.");
        setMode("in");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
    } finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Não foi possível entrar com Google.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Logo size="lg" showPhone className="mb-10 justify-center" />
        <form onSubmit={submit} className="surface-card space-y-4 p-6">
          <h1 className="text-2xl font-bold uppercase">{mode === "in" ? "Entrar" : "Criar acesso"}</h1>
          {mode === "up" && (
            <div className="space-y-1.5"><Label htmlFor="n">Seu nome</Label>
              <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} className="h-12" /></div>
          )}
          <div className="space-y-1.5"><Label htmlFor="e">E-mail</Label>
            <Input id="e" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" /></div>
          <div className="space-y-1.5"><Label htmlFor="p">Senha</Label>
            <Input id="p" type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" /></div>
          <Button type="submit" disabled={busy} className="h-12 w-full bg-gradient-red text-base font-semibold shadow-glow">
            {busy ? "Aguarde..." : mode === "in" ? "Entrar" : "Cadastrar"}
          </Button>
          <Button type="button" variant="secondary" onClick={google} className="h-12 w-full">Continuar com Google</Button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
