import { SupplierCommissions } from "@/components/SupplierCommissions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, productsQuery, productMatches, type Product } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin-gestao")({
  head: () => ({
    meta: [
      { title: "Gestão do site – NETINHO" },
      { name: "description", content: "Gestão de produtos, estoque e preços." },
      { property: "og:title", content: "Administração – NETINHO" },
      { property: "og:description", content: "Gestão de produtos, estoque e preços." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data: me, isLoading } = useQuery(meQuery);
  const { data: products } = useQuery(productsQuery);
  const [q, setQ] = useState("");
  const list = useMemo(
    () => (products ?? []).filter((p) => !q || productMatches(p, q)).slice(0, 60),
    [products, q],
  );

  if (isLoading) return null;
  if (!me?.isAdmin)
    return <p className="surface-card p-5 text-sm">Acesso restrito ao administrador.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold uppercase">Gestão do site</h1>
      <nav aria-label="Gestão do site" className="surface-card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        <Link to="/representantes" className="action-card">Representantes e mapas</Link>
        <Link to="/vendedores" className="action-card">Vendedores</Link>
        <Link to="/clientes" className="action-card">Clientes</Link>
        <Link to="/distribuidoras" className="action-card">Distribuidoras</Link>
        <Link to="/pedidos" className="action-card">Pedidos</Link>
        <a href="#representantes" className="action-card">Cadastrar representantes</a>
        <a href="#usuarios" className="action-card">Usuários e permissões</a>
        <a href="#produtos" className="action-card">Produtos, estoque e preços</a>
      </nav>
      <SupplierCommissions />
      <nav aria-label="Fichas e mapas dos representantes" className="surface-card space-y-3 p-4">
        <h2 className="text-xl font-bold">Representantes e regiões de atuação</h2>
        <p className="text-sm text-muted-foreground">Acesse os cadastros originais e seus mapas, sem perder as informações já registradas.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/representante" className="action-card min-h-24">
            <span className="font-bold text-amber-400">Abdenego Eugênio</span>
            <span className="block text-sm text-muted-foreground">Vale do Paraíba e Litoral Norte · Ver mapa e cadastro</span>
          </Link>
          <Link to="/representante-livaldo" className="action-card min-h-24">
            <span className="font-bold text-amber-400">Livaldo Souza Silva</span>
            <span className="block text-sm text-muted-foreground">Sorocaba e região · Ver mapa e cadastro de teste</span>
          </Link>
        </div>
      </nav>
      <RepresentativesAdmin />
      <div id="usuarios"><UserAttributionAdmin /></div>
      <h2 id="produtos" className="text-xl font-bold uppercase">Produtos, estoque e preços</h2>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar produto"
        className="h-12"
      />
      <ul className="space-y-2">
        {list.map((p) => (
          <ProductEditor key={p.id} p={p} />
        ))}
      </ul>
    </div>
  );
}

type ProfileAttribution = "Representante" | "Visitante" | "Cliente";
type ProfileAccessRow = {
  id: string;
  full_name: string;
  email: string;
  attribution: ProfileAttribution;
};

function UserAttributionAdmin() {
  const qc = useQueryClient();
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ["admin-profile-attributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,attribution")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ProfileAccessRow[];
    },
  });

  async function updateAttribution(user: ProfileAccessRow, attribution: ProfileAttribution) {
    if (attribution === user.attribution) return;
    setSavingUser(user.id);
    const { error } = await supabase.rpc("admin_set_profile_attribution", {
      p_target_user: user.id,
      p_attribution: attribution,
    });
    setSavingUser(null);
    if (error) {
      toast.error("Não foi possível salvar a atribuição.");
      return;
    }
    toast.success(`Atribuição de ${user.full_name || user.email} atualizada.`);
    void qc.invalidateQueries({ queryKey: ["admin-profile-attributions"] });
    void qc.invalidateQueries({ queryKey: ["access"] });
  }

  return (
    <section className="surface-card space-y-4 p-4">
      <div>
        <h2 className="text-xl font-bold">Cadastro e atribuição de usuários</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina como a conta será identificada na tela inicial. Esta atribuição não concede acesso a vendas.
        </p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando cadastros…</p>}
      {error && (
        <p className="text-sm text-amber-300" role="alert">
          Não foi possível carregar os cadastros. Verifique se a migração de atribuições foi aplicada.
        </p>
      )}
      {!isLoading && !error && profiles.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
      )}
      <ul className="space-y-2">
        {profiles.map((user) => (
          <li key={user.id} className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 w-full flex-1">
              <p className="break-words font-semibold text-slate-900">{user.full_name || "Sem nome"}</p>
              <p className="break-all text-xs text-slate-600">{user.email}</p>
            </div>
            <label className="flex w-full min-w-0 flex-col gap-1.5 text-xs font-semibold text-slate-700 sm:w-48">
              Atribuição
              <select
                aria-label={`Atribuição de ${user.full_name || user.email}`}
                value={user.attribution}
                disabled={savingUser === user.id}
                onChange={(event) => updateAttribution(user, event.target.value as ProfileAttribution)}
                className="min-h-11 w-full min-w-0 appearance-auto rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60"
              >
                <option value="Representante">Representante</option>
                <option value="Visitante">Visitante</option>
                <option value="Cliente">Cliente</option>
              </select>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

const PRICE_FIELDS = [
  ["price_cash", "À vista"],
  ["price_30", "30"],
  ["price_30_45_60", "30/45/60"],
  ["price_30_45_60_75", "30/45/60/75"],
] as const;

function ProductEditor({ p }: { p: Product }) {
  const qc = useQueryClient();
  type F = "stock" | (typeof PRICE_FIELDS)[number][0];
  const [v, setV] = useState<Record<F, string>>({
    stock: String(p.stock),
    price_cash: p.price_cash?.toString() ?? "",
    price_30: p.price_30?.toString() ?? "",
    price_30_45_60: p.price_30_45_60?.toString() ?? "",
    price_30_45_60_75: p.price_30_45_60_75?.toString() ?? "",
  });
  const [busy, setBusy] = useState(false);
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function save(extra?: { active: boolean }) {
    setBusy(true);
    const { error } = await supabase
      .from("products")
      .update({
        stock: parseInt(v.stock) || 0,
        price_cash: num(v.price_cash),
        price_30: num(v.price_30),
        price_30_45_60: num(v.price_30_45_60),
        price_30_45_60_75: num(v.price_30_45_60_75),
        ...extra,
      })
      .eq("id", p.id);
    setBusy(false);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success(`${p.code} atualizado`);
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  }

  return (
    <li className="surface-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">{p.code}</p>
          <p className="truncate text-xs text-muted-foreground">{p.application}</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          Ativo <Switch checked={p.active} onCheckedChange={(a) => save({ active: a })} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="text-xs text-muted-foreground">
          Estoque
          <Input
            value={v.stock}
            inputMode="numeric"
            onChange={(e) => setV({ ...v, stock: e.target.value })}
          />
        </label>
        {PRICE_FIELDS.map(([k, l]) => (
          <label key={k} className="text-xs text-muted-foreground">
            {l}
            <Input
              value={v[k]}
              inputMode="decimal"
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <Button size="sm" disabled={busy} onClick={() => save()} className="bg-gradient-red">
        Salvar
      </Button>
    </li>
  );
}

type Representative = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  active: boolean;
};

function RepresentativesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingAccess, setSavingAccess] = useState<string | null>(null);
  const [googleEmails, setGoogleEmails] = useState<Record<string, string>>({});
  async function authorizeGoogle(rep: { slug: string; full_name: string }) {
    const existingEmail = representatives.find(
      (item) => item.full_name.toLocaleLowerCase("pt-BR") === rep.full_name.toLocaleLowerCase("pt-BR")
    )?.email ?? "";
    const googleEmail = (googleEmails[rep.slug] ?? existingEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(googleEmail)) {
      toast.error("Informe o e-mail do representante.");
      return;
    }
    setSavingAccess(rep.slug);
    try {
      const current = representatives.find(
        (item) =>
          item.email.toLowerCase() === googleEmail ||
          item.full_name.toLocaleLowerCase("pt-BR") === rep.full_name.toLocaleLowerCase("pt-BR"),
      );
      const payload = { full_name: rep.full_name, email: googleEmail, active: true };
      const result = current
        ? await supabase
            .from("commercial_representatives" as never)
            .update(payload as never)
            .eq("id", current.id)
        : await supabase.from("commercial_representatives" as never).insert(payload as never);
      if (result.error) throw result.error;
      toast.success("E-mail de acesso autorizado para " + rep.full_name);
      void qc.invalidateQueries({ queryKey: ["commercial-representatives"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível autorizar o acesso.");
    } finally {
      setSavingAccess(null);
    }
  }
  const {
    data: representatives = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["commercial-representatives"],
    queryFn: async () => {
      const result = await supabase
        .from("commercial_representatives" as never)
        .select("*")
        .order("full_name");
      if (result.error) throw result.error;
      return (result.data ?? []) as Representative[];
    },
  });

  const { data: profiles = [], error: profilesError } = useQuery({
    queryKey: ["admin-representative-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("representative_profiles" as never)
        .select("slug,full_name,region")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as { slug: string; full_name: string; region: string }[];
    },
  });
  const defaultProfiles = [
    {
      slug: "abdenego-eugenio",
      full_name: "Abdenego Eugênio",
      region: "Vale do Paraíba e Litoral Norte",
    },
    {
      slug: "livaldo-souza-silva",
      full_name: "Livaldo Souza Silva",
      region: "Sorocaba e região · DDD 015",
    },
  ];
  const visibleProfiles = [
    ...profiles,
    ...defaultProfiles.filter((item) => !profiles.some((p) => p.slug === item.slug)),
  ];
  async function createRepresentative(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await supabase.from("commercial_representatives" as never).insert({
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      active: false,
    } as never);
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      "Representante cadastrado como inativo. Autorize o acesso para liberar as vendas.",
    );
    setName("");
    setEmail("");
    setPhone("");
    qc.invalidateQueries({ queryKey: ["commercial-representatives"] });
  }

  async function editRepresentative(rep: Representative) {
    const fullName = window.prompt("Nome completo do representante:", rep.full_name);
    if (fullName === null) return;
    if (!fullName.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    const email = window.prompt("E-mail do representante:", rep.email);
    if (email === null) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("E-mail inválido.");
      return;
    }
    const phone = window.prompt("Telefone do representante:", rep.phone ?? "");
    if (phone === null) return;
    const result = await supabase
      .from("commercial_representatives" as never)
      .update({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
      } as never)
      .eq("id", rep.id);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success("Representante atualizado.");
      qc.invalidateQueries({ queryKey: ["commercial-representatives"] });
    }
  }

  async function toggle(rep: Representative) {
    const result = await supabase
      .from("commercial_representatives" as never)
      .update({ active: !rep.active } as never)
      .eq("id", rep.id);
    if (result.error) toast.error(result.error.message);
    else {
      toast.success("Situação atualizada.");
      qc.invalidateQueries({ queryKey: ["commercial-representatives"] });
    }
  }

  return (
    <section id="representantes" className="surface-card space-y-4 p-4">
      <h2 className="text-xl font-bold">Cadastro de Representantes Comerciais</h2>
      <p className="text-sm text-muted-foreground">
        Cadastre os representantes, consulte suas fichas e controle quem está autorizado a vender. Novos cadastros começam inativos até sua aprovação.
      </p>
      <form onSubmit={createRepresentative} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label="Nome completo"
          required
          placeholder="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          aria-label="E-mail"
          required
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          aria-label="Telefone"
          type="tel"
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button disabled={busy} type="submit">
          Cadastrar representante
        </Button>
      </form>
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-lg font-bold">Fichas de representantes</h3>
        {profilesError && (
          <p className="text-xs text-amber-400">
            Falha ao consultar cadastros; exibindo representantes conhecidos.
          </p>
        )}
        {visibleProfiles.map((rep) => (
          <div
            key={rep.slug}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-semibold">{rep.full_name}</p>
              <p className="text-xs text-muted-foreground">{rep.region}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                aria-label={`E-mail de acesso de ${rep.full_name}`}
                placeholder="E-mail do representante"
                className="w-full min-w-0 sm:w-64"
                value={
                  googleEmails[rep.slug] ??
                  representatives.find(
                    (r) =>
                      r.full_name.toLocaleLowerCase("pt-BR") ===
                      rep.full_name.toLocaleLowerCase("pt-BR"),
                  )?.email ??
                  ""
                }
                onChange={(e) =>
                  setGoogleEmails((prev) => ({ ...prev, [rep.slug]: e.target.value }))
                }
              />
              <Button
                type="button"
                size="sm"
                disabled={savingAccess === rep.slug}
                className={representatives.some(
                  (item) =>
                    item.active &&
                    item.full_name.toLocaleLowerCase("pt-BR") === rep.full_name.toLocaleLowerCase("pt-BR") &&
                    item.email.toLowerCase() === (googleEmails[rep.slug] ?? item.email).trim().toLowerCase(),
                ) ? "bg-green-600 text-white hover:bg-green-700" : undefined}
                onClick={() => authorizeGoogle(rep)}
              >
                {savingAccess === rep.slug ? "Autorizando..." : representatives.some(
                  (item) =>
                    item.active &&
                    item.full_name.toLocaleLowerCase("pt-BR") === rep.full_name.toLocaleLowerCase("pt-BR") &&
                    item.email.toLowerCase() === (googleEmails[rep.slug] ?? item.email).trim().toLowerCase(),
                ) ? "Acesso liberado ✓" : "Autorizar acesso"}
              </Button>
            </div>
            <Link
              to="/editar-representante/$slug"
              params={{ slug: rep.slug }}
              className="rounded-lg border px-3 py-2 text-sm font-bold text-primary hover:bg-secondary"
            >
              Editar cadastro
            </Link>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive">
          Não foi possível carregar representantes. Verifique se a migração do banco foi aplicada.
        </p>
      )}
      {isLoading && <p className="text-sm">Carregando representantes...</p>}
      <ul className="space-y-2">
        {representatives.map((rep) => (
          <li
            key={rep.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-semibold">{rep.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {rep.email} · {rep.phone || "Sem telefone"}
              </p>
              <p className="text-xs">
                {rep.user_id ? "Conta vinculada" : "Aguardando vínculo de conta"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => editRepresentative(rep)}>
                Editar
              </Button>
              <label className="flex items-center gap-2 text-sm">
                Ativo
                <Switch checked={rep.active} onCheckedChange={() => toggle(rep)} />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
