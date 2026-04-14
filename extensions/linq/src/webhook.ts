import type { IncomingMessage, ServerResponse } from "node:http";
import type { ObjectId } from "mongodb";
import { parseLinqWebhookEvent, verifyLinqWebhookSignature } from "./client.js";
import type { LinqWebhookEvent } from "./types.js";
import { saveInboundMessage } from "../../../lib/db/messages.js";

/**
 * Reads the raw body from a Node IncomingMessage stream.
 */
async function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export type LinqWebhookHandlerOptions = {
  webhookSecret: string;
  /** MongoDB ObjectId of the household — used to scope persisted messages */
  householdId: ObjectId;
  onEvent: (event: LinqWebhookEvent) => void | Promise<void>;
};

/**
 * Returns an HTTP handler suitable for OpenClaw's webhook receiver.
 * Mount at POST /webhooks/linq in the gateway config.
 */
export function createLinqWebhookHandler(opts: LinqWebhookHandlerOptions) {
  return async function handleLinqWebhook(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const rawBody = await readRawBody(req);
    const signature = (req.headers["x-linq-signature"] as string) ?? "";

    // If a secret is configured, verify the HMAC signature
    if (opts.webhookSecret) {
      const valid = verifyLinqWebhookSignature({
        rawBody,
        signature,
        secret: opts.webhookSecret,
      });
      if (!valid) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const event = parseLinqWebhookEvent(body);
    if (!event) {
      // Unknown event type — ack and ignore
      res.writeHead(200);
      res.end();
      return;
    }

    // Persist inbound messages to MongoDB before firing the event handler
    if (event.type === "message.received") {
      try {
        await saveInboundMessage(opts.householdId, event.message);
      } catch (err) {
        console.error("[linq] failed to persist inbound message:", err);
        // Non-fatal — still deliver the event to the agent
      }
    }

    try {
      await opts.onEvent(event);
    } catch (err) {
      console.error("[linq] webhook handler error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal error" }));
      return;
    }

    res.writeHead(200);
    res.end();
  };
}
