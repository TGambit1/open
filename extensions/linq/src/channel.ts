import { createChatChannelPlugin } from "openclaw/plugin-sdk/channel-core";
import { buildOutboundBaseSessionKey, type RoutePeer } from "openclaw/plugin-sdk/routing";
import { LinqClient } from "./client.js";
import { resolveLinqAccount } from "./config.js";
import type { LinqAccountConfig, LinqProtocol } from "./types.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeE164(value: string): string | null {
  // Strip whitespace and dashes; accept +1XXXXXXXXXX or 1XXXXXXXXXX
  const cleaned = value.replace(/[\s\-().]/g, "");
  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;
  if (/^\d{10,15}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

function buildLinqSessionKey(params: {
  agentId: string;
  peer: RoutePeer;
}): string {
  return buildOutboundBaseSessionKey({
    cfg: {} as never,
    agentId: params.agentId,
    channel: "linq",
    peer: params.peer,
  });
}

// ── Channel plugin ─────────────────────────────────────────────────────────

export function createLinqChannelPlugin(accountCfg?: LinqAccountConfig) {
  const account = resolveLinqAccount(accountCfg);

  const client = account.configured
    ? new LinqClient(account.apiToken)
    : null;

  return createChatChannelPlugin({
    channelId: "linq",

    // ── Status ─────────────────────────────────────────────────────────────
    getStatus() {
      if (!account.configured) {
        return {
          ok: false,
          summary: "Linq not configured — set LINQ_API_TOKEN and LINQ_FROM_NUMBER",
        };
      }
      return { ok: true, summary: "Linq ready" };
    },

    // ── Outbound ───────────────────────────────────────────────────────────
    async send(params: {
      agentId: string;
      target: string;
      text: string;
      protocol?: LinqProtocol;
    }) {
      if (!client || !account.configured) {
        throw new Error("Linq is not configured");
      }

      // target can be a phone number or an existing chatId
      let chatId: string;
      const looksLikeChatId = params.target.startsWith("chat_");

      if (looksLikeChatId) {
        chatId = params.target;
      } else {
        // target is a phone number → create or reuse DM chat
        const e164 = normalizeE164(params.target);
        if (!e164) throw new Error(`Invalid Linq target: ${params.target}`);

        const chat = await client.createChat({
          participants: [e164],
          protocol: params.protocol ?? account.defaultProtocol,
        });
        chatId = chat.id;
      }

      return client.sendMessage({ chatId, text: params.text });
    },

    // ── Group chat creation ────────────────────────────────────────────────
    async createGroupChat(params: {
      participants: string[];
      groupName?: string;
      protocol?: LinqProtocol;
    }) {
      if (!client) throw new Error("Linq is not configured");
      return client.createChat({
        participants: params.participants,
        protocol: params.protocol ?? account.defaultProtocol,
        groupName: params.groupName,
      });
    },

    // ── Routing ────────────────────────────────────────────────────────────
    resolveOutboundRoute(params: { agentId: string; target: string }) {
      const e164 = normalizeE164(params.target);
      const peerId = e164 ?? params.target;
      const peer: RoutePeer = { kind: "direct", id: peerId };
      const sessionKey = buildLinqSessionKey({
        agentId: params.agentId,
        peer,
      });
      return { sessionKey, baseSessionKey: sessionKey, peer };
    },
  });
}
