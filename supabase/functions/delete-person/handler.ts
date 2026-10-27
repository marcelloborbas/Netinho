export interface DeletePersonServices {
  authenticate(token: string): Promise<{ id: string } | null>;
  isAdmin(userId: string): Promise<boolean>;
  targetExists(userId: string): Promise<boolean>;
  deleteUser(userId: string): Promise<void>;
  verifyRemoved(userId: string): Promise<boolean>;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export async function handleDeletePerson(request: Request, services: DeletePersonServices): Promise<Response> {
  const respond = (status: number, message: string, extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ message, ...extra }), { status, headers });
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return respond(405, "Método não permitido.");
  const bearer = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i);
  const token = bearer?.[1];
  if (!token) return respond(401, "Identificação necessária.");
  try {
    const user = await services.authenticate(token);
    if (!user) return respond(401, "Sessão inválida.");
    if (!await services.isAdmin(user.id)) return respond(403, "Somente o administrador pode excluir pessoas.");
    let body: unknown;
    try { body = await request.json(); } catch { return respond(400, "Dados inválidos."); }
    if (!body || typeof body !== "object" || !("userId" in body)) return respond(400, "Usuário inválido.");
    const target = body.userId;
    if (typeof target !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)) {
      return respond(400, "Usuário inválido.");
    }
    const userId = target.toLowerCase();
    if (userId === user.id.toLowerCase()) return respond(403, "Não é permitido excluir a própria conta administrativa.");
    if (!await services.targetExists(userId)) return respond(404, "Conta de usuário não encontrada.");
    try {
      // Auth deletion and the cleanup trigger execute in the same database transaction.
      await services.deleteUser(userId);
    } catch {
      return respond(409, "Exclusão não concluída. A conta pode ter vínculos de supervisão ou arquivos que impedem a remoção. Nenhum sucesso foi confirmado.");
    }
    if (!await services.verifyRemoved(userId)) {
      return respond(500, "Não foi possível confirmar a remoção completa. Atualize PESSOAL antes de tentar novamente.");
    }
    return respond(200, "Conta excluída permanentemente.", { success: true, deletedUserId: userId });
  } catch {
    return respond(500, "Não foi possível concluir a exclusão. Atualize PESSOAL e tente novamente.");
  }
}