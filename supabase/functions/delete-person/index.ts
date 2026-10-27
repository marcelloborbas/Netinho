import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleDeletePerson } from "./handler.ts";

Deno.serve(async (request: Request) => {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return new Response(JSON.stringify({ message: "Configuração administrativa indisponível." }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const client = createClient(url, anon, options);
  const admin = createClient(url, service, options);
  return handleDeletePerson(request, {
    async authenticate(token) {
      const { data, error } = await client.auth.getUser(token);
      return error || data.user?.is_anonymous ? null : data.user;
    },
    async isAdmin(userId) {
      const { data, error } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    async targetExists(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error && error.status !== 404) throw error;
      return Boolean(data.user);
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId, false);
      if (error) throw error;
    },
    async verifyRemoved(userId) {
      const [auth, profile, roles, representatives] = await Promise.all([
        admin.auth.admin.getUserById(userId),
        admin.from("profiles").select("id").eq("id", userId),
        admin.from("user_roles").select("id").eq("user_id", userId),
        admin.from("commercial_representatives").select("id").eq("user_id", userId),
      ]);
      if (auth.error && auth.error.status !== 404) throw auth.error;
      if (profile.error || roles.error || representatives.error) throw new Error("Cleanup verification failed");
      return !auth.data.user && !profile.data?.length && !roles.data?.length && !representatives.data?.length;
    },
  });
});
