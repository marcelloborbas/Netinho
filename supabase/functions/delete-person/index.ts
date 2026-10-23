import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
  if (request.method === "OPTIONS") return new Response(null, { headers });
  const respond = (status: number, message: string) => new Response(JSON.stringify({ message }), { status, headers });
  if (request.method !== "POST") return respond(405, "Método não permitido.");
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond(401, "Identificação necessária.");
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return respond(500, "Configuração administrativa indisponível.");
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return respond(401, "Sessão inválida.");
  const admin = createClient(url, service);
  const { data: role, error: roleError } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (roleError || !role) return respond(403, "Somente o administrador pode excluir pessoas.");
  let target: string;
  try { const body = await request.json(); target = body.userId; } catch { return respond(400, "Dados inválidos."); }
  if (typeof target !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(target)) return respond(400, "Usuário inválido.");
  if (target === user.id) return respond(403, "Não é permitido excluir a própria conta administrativa.");
  const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("id", target).maybeSingle();
  if (profileError || !profile) return respond(404, "Cadastro não encontrado.");
  // A exclusão do Auth remove a conta e aplica as regras FK do banco.
  // Se houver vínculos que impeçam a exclusão, não mascarar falha como sucesso.
  const { error: deleteError } = await admin.auth.admin.deleteUser(target);
  if (deleteError) return respond(409, "Exclusão não concluída: " + deleteError.message);
  return respond(200, "Conta excluída permanentemente.");
});
