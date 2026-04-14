#!/usr/bin/env node
/**
 * Home server
 * - GET  /           → landing page
 * - POST /webhooks/linq → Linq inbound message handler
 * - GET  /health     → Railway health check
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { createHmac } from "node:crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 3000;

// ── MongoDB ────────────────────────────────────────────────────────────────

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error("MONGODB_URI is not set");

const mongoClient = new MongoClient(mongoUri, {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
});
await mongoClient.connect();
const db = mongoClient.db("home");

// Ensure indexes (idempotent)
await Promise.all([
  db.collection("households").createIndex({ slug: 1 }, { unique: true }),
  db.collection("messages").createIndex({ linqMessageId: 1 }, { unique: true }),
  db.collection("messages").createIndex({ householdId: 1, sentAt: -1 }),
  db.collection("memory").createIndex({ householdId: 1, type: 1, key: 1 }),
  db.collection("resources").createIndex(
    { householdId: 1, category: 1, name: 1 },
    { unique: true },
  ),
]);

console.log("✓ MongoDB connected");

// ── Static landing page ────────────────────────────────────────────────────

const LANDING_DIR = join(__dirname, "ui", "landing");

function serveStatic(res, filename) {
  try {
    const content = readFileSync(join(LANDING_DIR, filename));
    const ext = extname(filename);
    const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[ext] ?? "text/plain";
    res.writeHead(200, { "Content-Type": `${mime}; charset=utf-8` });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function buildLandingHtml(profile) {
  let html = readFileSync(join(LANDING_DIR, "index.html"), "utf8");
  // Inject HOME_CONFIG before </head>
  const config = {
    name: profile?.name ?? "Home",
    emoji: profile?.emoji ?? "🏡",
    bio: profile?.bio ?? "",
    phoneNumber: profile?.phoneNumber ?? process.env.LINQ_FROM_NUMBER ?? "",
    groupChatId: profile?.groupChatId ?? null,
  };
  const script = `<script>window.HOME_CONFIG = ${JSON.stringify(config)};</script>`;
  html = html.replace("</head>", `${script}\n</head>`);
  return html;
}

// ── Webhook helpers ────────────────────────────────────────────────────────

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function verifySignature(rawBody, signature, secret) {
  if (!secret) return true;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// ── HTTP server ────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Landing page
  if (req.method === "GET" && url.pathname === "/") {
    try {
      // Try to load the default household profile from DB
      const household = await db.collection("households").findOne({});
      const profile = household
        ? {
            name: household.name,
            emoji: household.emoji,
            bio: household.bio,
            phoneNumber: household.linq?.fromNumber,
            groupChatId: household.linq?.groupChatId,
          }
        : null;
      const html = buildLandingHtml(profile);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (err) {
      console.error("Landing page error:", err);
      serveStatic(res, "index.html");
    }
    return;
  }

  // Static assets (style.css, app.js)
  if (req.method === "GET" && (url.pathname === "/style.css" || url.pathname === "/app.js")) {
    serveStatic(res, url.pathname.slice(1));
    return;
  }

  // Linq webhook
  if (req.method === "POST" && url.pathname === "/webhooks/linq") {
    const rawBody = await readBody(req);
    const signature = req.headers["x-linq-signature"] ?? "";
    const secret = process.env.LINQ_WEBHOOK_SECRET ?? "";

    if (!verifySignature(rawBody, signature, secret)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    if (event?.type === "message.received" && event.message) {
      const msg = event.message;
      try {
        // Resolve household by from-number
        const household = await db.collection("households").findOne({
          "linq.fromNumber": process.env.LINQ_FROM_NUMBER,
        });
        const householdId = household?._id ?? new ObjectId();

        await db.collection("messages").updateOne(
          { linqMessageId: msg.id },
          {
            $setOnInsert: {
              householdId,
              linqMessageId: msg.id,
              chatId: msg.chatId,
              direction: "inbound",
              from: msg.from,
              text: msg.text ?? null,
              attachmentUrl: msg.attachmentUrl ?? null,
              protocol: msg.protocol,
              replyToMessageId: msg.replyToMessageId ?? null,
              sentAt: new Date(msg.sentAt),
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );

        console.log(`[linq] inbound from ${msg.from}: ${msg.text ?? "(attachment)"}`);
      } catch (err) {
        console.error("[linq] failed to persist message:", err);
      }
    }

    res.writeHead(200);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`✓ Home server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  server.close();
  await mongoClient.close();
  process.exit(0);
});
