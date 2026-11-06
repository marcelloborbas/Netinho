import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { homeShareImage } from "./lib/home-share-image";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Alguns robôs de prévia não executam JavaScript. Garantimos que os dados
// Open Graph estejam presentes no HTML entregue pelo servidor na página inicial.
const shareMeta = [
  '<meta property="og:type" content="website" />',
  '<meta property="og:site_name" content="Netinho Auto Parts" />',
  '<meta property="og:title" content="Catálogo B2B e pedidos de autopeças | Netinho Auto Parts" />',
  '<meta property="og:description" content="Consulte o catálogo de autopeças da Netinho Auto Parts e acesse sua área para montar e acompanhar pedidos B2B." />',
  '<meta property="og:url" content="https://www.netinhoautoparts.live/" />',
  `<meta property="og:image" content="${homeShareImage.url}" />`,
  `<meta property="og:image:type" content="${homeShareImage.type}" />`,
  `<meta property="og:image:width" content="${homeShareImage.width}" />`,
  `<meta property="og:image:height" content="${homeShareImage.height}" />`,
  '<meta property="og:image:alt" content="Logo Netinho Auto Parts" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:title" content="Catálogo B2B e pedidos de autopeças | Netinho Auto Parts" />',
  '<meta name="twitter:description" content="Consulte o catálogo de autopeças da Netinho Auto Parts e acesse sua área para montar e acompanhar pedidos B2B." />',
  `<meta name="twitter:image" content="${homeShareImage.url}" />`,
].join("\n");

async function ensureShareMetadata(request: Request, response: Response): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== "/" || request.method !== "GET" || !response.ok) return response;
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

  const html = await response.text();
  const headMatch = /<head(?:\s[^>]*)?>/i.exec(html);
  if (!headMatch) return new Response(html, response);

  // Remove apenas metadados de compartilhamento anteriores, evitando duplicidade.
  const cleanHtml = html.replace(/<meta\s+[^>]*(?:property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*\/?\s*>/gi, "");
  const updatedHtml = cleanHtml.replace(/<head(?:\s[^>]*)?>/i, (tag) => tag + "\n" + shareMeta + "\n");
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(updatedHtml, { status: response.status, statusText: response.statusText, headers });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await ensureShareMetadata(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
