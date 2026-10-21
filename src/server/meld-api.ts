import type { IncomingMessage, ServerResponse } from "node:http";
import { MELD_API_VERSION } from "../lib/meld/endpoints";

const apiPrefix = "/api/meld";
const maxRequestBodyBytes = 2 * 1024 * 1024;

type MeldEnvironment = "sandbox" | "production";
const forwardedHeaderNames = new Set([
  "meld-account-id",
  "meld-passthrough-reference",
  "meld-passthrough-key-id",
  "meld-passthrough-key-public",
  "meld-passthrough-key-private",
  "meld-passthrough-oauth",
  "x-idempotency-key",
]);

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}

async function readRequestBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    totalBytes += bytes.byteLength;
    if (totalBytes > maxRequestBodyBytes) {
      throw new Error("Request body is too large");
    }
    chunks.push(bytes);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Handles the dashboard's same-origin API routes. Returns false for unrelated paths. */
export async function handleMeldApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  if (requestUrl.pathname !== apiPrefix && !requestUrl.pathname.startsWith(`${apiPrefix}/`)) {
    return false;
  }

  if (requestUrl.pathname === `${apiPrefix}/config`) {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      sendJson(res, 405, { error: "Method not allowed" });
      return true;
    }
    sendJson(res, 200, { configured: Boolean(process.env.MELD_API_KEY?.trim()) });
    return true;
  }

  const routeMatch = requestUrl.pathname.match(/^\/api\/meld\/(sandbox|production)(\/.*)?$/);
  if (!routeMatch) {
    sendJson(res, 404, { error: "Meld API route not found" });
    return true;
  }

  const method = req.method;
  if (method !== "GET" && method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE");
    sendJson(res, 405, { error: "Method not allowed" });
    return true;
  }

  const overrideAuthorization = req.headers.authorization?.trim();
  if (overrideAuthorization && !/^BASIC\s+\S+$/i.test(overrideAuthorization)) {
    sendJson(res, 400, { error: "Authorization override must use the BASIC scheme" });
    return true;
  }

  const apiKey = process.env.MELD_API_KEY?.trim();
  if (!overrideAuthorization && !apiKey) {
    sendJson(res, 503, { error: "Set MELD_API_KEY in .env or enter an API key override" });
    return true;
  }

  const environment = routeMatch[1] as MeldEnvironment;
  const upstreamBase = environment === "sandbox" ? "https://api-sb.meld.io" : "https://api.meld.io";
  const upstreamUrl = `${upstreamBase}${routeMatch[2] || "/"}${requestUrl.search}`;

  try {
    const headers = new Headers({
      Authorization: overrideAuthorization || `BASIC ${apiKey}`,
      Accept: "application/json",
      "Meld-Version": MELD_API_VERSION,
    });
    const contentType = req.headers["content-type"];
    if (typeof contentType === "string") headers.set("Content-Type", contentType);
    for (const [name, value] of Object.entries(req.headers)) {
      if (forwardedHeaderNames.has(name.toLowerCase()) && typeof value === "string") {
        headers.set(name, value);
      }
    }

    const options: RequestInit = { method, headers };
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const body = await readRequestBody(req);
      if (body.byteLength > 0) options.body = Buffer.from(body).toString("utf8");
    }

    const upstreamResponse = await fetch(upstreamUrl, options);
    const responseBody = new Uint8Array(await upstreamResponse.arrayBuffer());
    res.statusCode = upstreamResponse.status;
    res.setHeader("Cache-Control", "no-store");
    const responseContentType = upstreamResponse.headers.get("content-type");
    if (responseContentType) res.setHeader("Content-Type", responseContentType);
    const requestId = upstreamResponse.headers.get("x-request-id");
    if (requestId) res.setHeader("x-request-id", requestId);
    res.end(responseBody);
  } catch (error) {
    if (error instanceof Error && error.message === "Request body is too large") {
      sendJson(res, 413, { error: error.message });
      return true;
    }
    sendJson(res, 502, { error: "Unable to reach the Meld API" });
  }

  return true;
}
