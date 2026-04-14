/**
 * AI response layer for Home.
 *
 * respond(params) — given an inbound message, calls Claude and returns the reply text.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WORKSPACE_DIR = join(__dirname, "../../workspace");

// ── Anthropic client (lazy) ────────────────────────────────────────────────

let anthropic = null;

function getAnthropic() {
  if (anthropic) return anthropic;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  anthropic = new Anthropic();
  return anthropic;
}

// ── Workspace → system prompt ──────────────────────────────────────────────

function readWorkspaceFile(filename) {
  const p = join(WORKSPACE_DIR, filename);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8").trim();
}

function buildSystemPrompt() {
  const files = [
    { name: "SOUL.md", required: true },
    { name: "IDENTITY.md", required: false },
    { name: "USER.md", required: false },
    { name: "MEMORY.md", required: false },
    { name: "TOOLS.md", required: false },
  ];

  const parts = [];
  for (const { name } of files) {
    const content = readWorkspaceFile(name);
    if (content) {
      parts.push(`<!-- ${name} -->\n${content}`);
    }
  }

  // Add today's daily memory log if it exists
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  for (const date of [yesterday, today]) {
    const content = readWorkspaceFile(`memory/${date}.md`);
    if (content) {
      parts.push(`<!-- memory/${date}.md -->\n${content}`);
    }
  }

  return parts.join("\n\n");
}

// ── Conversation history → messages array ─────────────────────────────────

function historyToMessages(rows) {
  return rows.map((row) => ({
    role: row.direction === "outbound" ? "assistant" : "user",
    content: row.text ?? "(attachment)",
  }));
}

// ── Main respond function ─────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string} params.text       — the inbound message text
 * @param {string} params.chatId     — Linq chatId
 * @param {string} params.fromNumber — sender phone number
 * @param {import("mongodb").Db} params.db — MongoDB db instance
 * @returns {Promise<string>}        — reply text
 */
export async function respond({ text, chatId, fromNumber, db }) {
  // 1. Build system prompt from workspace files
  const systemPrompt = buildSystemPrompt();

  // 2. Load recent conversation history for this chat (last 20 messages)
  const recentMessages = await db
    .collection("messages")
    .find({ chatId })
    .sort({ sentAt: -1 })
    .limit(20)
    .toArray();

  // Reverse to chronological order, exclude the just-received message (it's not in DB yet)
  const history = historyToMessages(recentMessages.reverse());

  // 3. Append the current inbound message
  const messages = [
    ...history,
    { role: "user", content: text ?? "(attachment)" },
  ];

  // 4. Call Claude
  const client = getAnthropic();

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const response = await stream.finalMessage();

  // Extract text from response content blocks
  const replyText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return replyText || "Sorry, I couldn't generate a response.";
}
