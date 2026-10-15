import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const allowed = new Set(["abdenego-eugenio", "livaldo-souza-silva"]);
const emailFor = (slug: string) => `rep-${slug}@representantes.netinho.example.com`;
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== "POST") return reply(405, { error: "Método inválido" });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
    if (!token) return reply(401, { error: "Autenticação necessária" });
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: identity, error: identityError } = await admin.auth.getUser(token);
    if (identityError || !identity.user) return reply(401, { error: "Sessão inválida" });
    const { data: role, error: roleError } = await admin.from("user_roles").select("role").eq("user_id", identity.user.id).eq("role", "admin").maybeSingle();
    if (roleError || !role) return reply(403, { error: "Apenas administrador" });
    const { slug, password } = await req.json();
    if (typeof slug !== "string" || !allowed.has(slug) || typeof password !== "string" || password.length < 8 || password.length > 128) return reply(400, { error: "Representante ou senha inválidos" });
    const email = emailFor(slug);
    const { data: existing, error: lookupError } = await admin.from("commercial_representatives").select("id,user_id").eq("email", email).maybeSingle();
    if (lookupError) return reply(500, { error: "Não foi possível consultar representante" });
    let userId = existing?.user_id as string | undefined;
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return reply(500, { error: "Não foi possível atualizar a senha" });
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) return reply(500, { error: "Não foi possível criar a conta do representante" });
      userId = data.user.id;
    }
    const names: Record<string, string> = { "abdenego-eugenio": "Abdenego Eugênio", "livaldo-souza-silva": "Livaldo Souza Silva" };
    const { error: saveError } = existing
      ? await admin.from("commercial_representatives").update({ user_id: userId, active: true, full_name: names[slug] }).eq("id", existing.id)
      : await admin.from("commercial_representatives").insert({ user_id: userId, email, full_name: names[slug], active: true });
    if (saveError) return reply(500, { error: "Conta criada, mas não foi possível ativar o representante" });
    return reply(200, { ok: true });
  } catch { return reply(500, { error: "Falha ao definir senha" }); }
});
