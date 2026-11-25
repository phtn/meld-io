import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const webhookPath = "/api/webhooks/meld";
const adminWebhooksPath = "/api/admin/webhooks";
const maxWebhookBodyBytes = 1024 * 1024;
const maxStoredEvents = 500;
const signatureToleranceMs = 5 * 60 * 1000;
const storePath = resolve(process.cwd(), ".data/meld-webhooks.json");

export interface StoredWebhookEvent {
  id: string;
  receivedAt: string;
  eventType: string;
  eventId: string | null;
  accountId: string | null;
  profileId: string | null;
  version: string | null;
  timestamp: string | null;
  signatureTimestamp: string;
  deliveries: number;
  body: unknown;
}

let events: StoredWebhookEvent[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
    totalBytes += bytes.byteLength;
    if (totalBytes > maxWebhookBodyBytes) throw new Error("Request body is too large");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Meld signs `<timestamp>.<url>.<raw body>` with the URL it delivered to, so behind a tunnel or
 * proxy the public URL must be reconstructed. MELD_WEBHOOK_URL overrides it when that isn't possible.
 */
function getDeliveryUrl(req: IncomingMessage): string {
  const configured = process.env.MELD_WEBHOOK_URL?.trim();
  if (configured) return configured;
  const proto = getHeader(req, "x-forwarded-proto")?.split(",")[0].trim() || "http";
  const host = getHeader(req, "x-forwarded-host")?.split(",")[0].trim() || getHeader(req, "host") || "localhost";
  return `${proto}://${host}${req.url || webhookPath}`;
}

function computeSignature(secret: string, timestamp: string, url: string, body: Buffer): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${url}.`)
    .update(body)
    .digest("base64url");
}

function signaturesMatch(expected: string, received: string): boolean {
  // Meld sends base64url with padding; Node's base64url omits it.
  const a = Buffer.from(expected.replace(/=+$/, ""));
  const b = Buffer.from(received.trim().replace(/=+$/, ""));
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

async function loadEvents(): Promise<StoredWebhookEvent[]> {
  if (events) return events;
  try {
    const parsed: unknown = JSON.parse(await readFile(storePath, "utf8"));
    events = Array.isArray(parsed) ? (parsed as StoredWebhookEvent[]) : [];
  } catch {
    events = [];
  }
  return events;
}

function persistEvents(snapshot: StoredWebhookEvent[]): Promise<void> {
  writeQueue = writeQueue
    .then(async () => {
      await mkdir(dirname(storePath), { recursive: true });
      await writeFile(storePath, JSON.stringify(snapshot));
    })
    .catch((error) => console.error("[meld-webhooks] Failed to persist events", error));
  return writeQueue;
}

async function recordEvent(body: unknown, signatureTimestamp: string): Promise<StoredWebhookEvent> {
  const list = await loadEvents();
  const record = isRecord(body) ? body : {};
  const eventId = stringOrNull(record.eventId);

  // Meld retries until it gets a 2xx, so collapse redeliveries of the same event.
  const existing = eventId ? list.find((event) => event.eventId === eventId) : undefined;
  if (existing) {
    existing.deliveries += 1;
    existing.receivedAt = new Date().toISOString();
    existing.signatureTimestamp = signatureTimestamp;
    await persistEvents(list);
    return existing;
  }

  const event: StoredWebhookEvent = {
    id: eventId ?? crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    eventType: stringOrNull(record.eventType) ?? "UNKNOWN",
    eventId,
    accountId: stringOrNull(record.accountId),
    profileId: stringOrNull(record.profileId),
    version: stringOrNull(record.version),
    timestamp: stringOrNull(record.timestamp),
    signatureTimestamp,
    deliveries: 1,
    body,
  };
  list.unshift(event);
  if (list.length > maxStoredEvents) list.length = maxStoredEvents;
  await persistEvents(list);
  return event;
}

async function handleWebhookDelivery(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const secret = process.env.MELD_WEBHOOK_SECRET?.trim();
  if (!secret) {
    sendJson(res, 503, { error: "MELD_WEBHOOK_SECRET is not configured" });
    return;
  }

  const signature = getHeader(req, "meld-signature");
  const signatureTimestamp = getHeader(req, "meld-signature-timestamp");
  if (!signature || !signatureTimestamp) {
    sendJson(res, 401, { error: "Missing Meld signature headers" });
    return;
  }

  const signedAt = Date.parse(signatureTimestamp);
  if (Number.isNaN(signedAt) || Math.abs(Date.now() - signedAt) > signatureToleranceMs) {
    sendJson(res, 401, { error: "Signature timestamp is outside the allowed window" });
    return;
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch {
    sendJson(res, 413, { error: "Request body is too large" });
    return;
  }

  const deliveryUrl = getDeliveryUrl(req);
  const expected = computeSignature(secret, signatureTimestamp, deliveryUrl, rawBody);
  if (!signaturesMatch(expected, signature)) {
    console.warn(`[meld-webhooks] Signature mismatch for ${deliveryUrl}. Set MELD_WEBHOOK_URL if Meld delivers to a different public URL.`);
    sendJson(res, 401, { error: "Invalid signature" });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    sendJson(res, 400, { error: "Body must be JSON" });
    return;
  }

  const event = await recordEvent(body, signatureTimestamp);
  sendJson(res, 200, { received: true, id: event.id });
}

async function handleAdminList(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // TODO: gate behind admin auth before exposing outside local development.
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const list = await loadEvents();
  sendJson(res, 200, { events: list, count: list.length });
}

/** Handles Meld webhook deliveries and the admin listing route. Returns false for unrelated paths. */
export async function handleMeldWebhookRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathname = new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "");
  if (pathname === webhookPath) {
    await handleWebhookDelivery(req, res);
    return true;
  }
  if (pathname === adminWebhooksPath) {
    await handleAdminList(req, res);
    return true;
  }
  return false;
}
