#!/usr/bin/env node
/**
 * Home setup script
 * Run: npm run setup
 *
 * Guides the user through:
 *  1. Installing OpenClaw
 *  2. Copying the Home workspace
 *  3. Setting up the Linq channel
 *  4. Registering the webhook
 */

import { execSync } from "node:child_process";
import { existsSync, cpSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const OPENCLAW_WORKSPACE = join(homedir(), ".openclaw", "workspace");
const HOME_WORKSPACE = new URL("../workspace", import.meta.url).pathname;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

console.log("\n🏡  Home setup\n");
console.log('   "Don\'t Stress, get home"\n');

// ── 1. Check openclaw ────────────────────────────────────────────────────
console.log("── Step 1: OpenClaw\n");
try {
  execSync("openclaw --version", { stdio: "pipe" });
  console.log("   ✓ openclaw is installed\n");
} catch {
  console.log("   Installing openclaw...");
  execSync("npm install -g openclaw", { stdio: "inherit" });
  console.log();
}

// ── 2. Copy workspace ────────────────────────────────────────────────────
console.log("── Step 2: Workspace\n");
if (existsSync(OPENCLAW_WORKSPACE)) {
  const overwrite = await ask(
    `   ~/.openclaw/workspace already exists. Overwrite? (y/N) `,
  );
  if (overwrite.trim().toLowerCase() !== "y") {
    console.log("   Skipped.\n");
  } else {
    cpSync(HOME_WORKSPACE, OPENCLAW_WORKSPACE, { recursive: true });
    console.log(`   ✓ Workspace copied to ${OPENCLAW_WORKSPACE}\n`);
  }
} else {
  cpSync(HOME_WORKSPACE, OPENCLAW_WORKSPACE, { recursive: true });
  console.log(`   ✓ Workspace copied to ${OPENCLAW_WORKSPACE}\n`);
}

// ── 3. MongoDB Atlas ─────────────────────────────────────────────────────
console.log("── Step 3: MongoDB Atlas\n");
console.log("   Home uses MongoDB Atlas (free tier) to store messages, memory, and household data.");
console.log("   Nothing is stored on this device — all data lives in the cloud.\n");
console.log("   1. Go to https://mongodb.com/atlas and create a free account");
console.log("   2. Create a free M0 cluster");
console.log("   3. Under Database Access, create a user with readWrite permissions");
console.log("   4. Under Network Access, allow connections from your IP (or 0.0.0.0/0 for now)");
console.log("   5. Click Connect → Drivers → copy the connection string\n");

const mongoUri = await ask("   MONGODB_URI (leave blank to configure later): ");
if (mongoUri.trim()) {
  console.log("\n   Add this to your shell profile or .env file:\n");
  console.log(`   export MONGODB_URI="${mongoUri.trim()}"\n`);
} else {
  console.log("   Skipped — set MONGODB_URI before starting Home.\n");
}

// ── 4. Linq setup ────────────────────────────────────────────────────────
console.log("── Step 3: Linq (iMessage / SMS / MMS channel)\n");
console.log("   Home uses Linq to send and receive group texts.\n");
console.log("   1. Create an account at https://linqapp.com");
console.log("   2. Get your API token from Settings → API Keys");
console.log("   3. Note your From Number (E.164, e.g. +12125551234)\n");

const apiToken = await ask("   LINQ_API_TOKEN (leave blank to configure later): ");
const fromNumber = await ask("   LINQ_FROM_NUMBER (leave blank to configure later): ");
const webhookSecret = await ask("   LINQ_WEBHOOK_SECRET (leave blank to configure later): ");

if (apiToken || fromNumber) {
  console.log("\n   Add these to your shell profile or .env file:\n");
  if (apiToken)      console.log(`   export LINQ_API_TOKEN="${apiToken.trim()}"`);
  if (fromNumber)    console.log(`   export LINQ_FROM_NUMBER="${fromNumber.trim()}"`);
  if (webhookSecret) console.log(`   export LINQ_WEBHOOK_SECRET="${webhookSecret.trim()}"`);
  console.log();
}

// ── 5. Webhook ───────────────────────────────────────────────────────────
console.log("── Step 4: Webhook\n");
console.log("   Register this URL in the Linq dashboard (Settings → Webhooks):\n");
const serverUrl = await ask("   Your Home server URL (e.g. https://home.example.com): ");
if (serverUrl.trim()) {
  console.log(`\n   Webhook URL: ${serverUrl.trim()}/webhooks/linq\n`);
} else {
  console.log("\n   Webhook URL: https://your-server.example.com/webhooks/linq\n");
}

// ── 6. Group chat ────────────────────────────────────────────────────────
console.log("── Step 5: Group chat\n");
console.log("   Once your Linq credentials are set, create the household group:\n");
console.log("   home linq create-group --name \"Home\" --participants +1XXX,+1YYY\n");
console.log("   This generates a group chat ID that the landing page links to.\n");

// ── Done ─────────────────────────────────────────────────────────────────
console.log("── Done!\n");
console.log("   Next steps:");
console.log("   1. Set your env vars and run: openclaw gateway");
console.log("   2. Create the group chat:     home linq create-group");
console.log("   3. Serve the landing page:    ui/landing/index.html");
console.log("   4. Share your Linq link!      🏡");
console.log();
console.log("   Required env vars:");
console.log("   MONGODB_URI             — MongoDB Atlas connection string");
console.log("   LINQ_API_TOKEN          — Linq API token");
console.log("   LINQ_FROM_NUMBER        — Your Linq phone number (E.164)");
console.log("   LINQ_WEBHOOK_SECRET     — Linq webhook HMAC secret\n");

rl.close();
