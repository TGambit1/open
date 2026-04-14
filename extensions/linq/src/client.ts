import { createHmac } from "node:crypto";
import type {
  LinqChat,
  LinqCreateChatParams,
  LinqMessage,
  LinqSendMessageParams,
  LinqWebhookEvent,
} from "./types.js";

const LINQ_API_BASE = "https://api.linqapp.com/v1";

export class LinqApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Linq API error ${status}`);
    this.name = "LinqApiError";
  }
}

export class LinqClient {
  constructor(private readonly apiToken: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${LINQ_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new LinqApiError(res.status, json);
    }

    return json as T;
  }

  // ── Chats ────────────────────────────────────────────────────────────────

  async createChat(params: LinqCreateChatParams): Promise<LinqChat> {
    return this.request<LinqChat>("POST", "/chats", params);
  }

  async getChat(chatId: string): Promise<LinqChat> {
    return this.request<LinqChat>("GET", `/chats/${chatId}`);
  }

  async addParticipant(chatId: string, participant: string): Promise<LinqChat> {
    return this.request<LinqChat>("POST", `/chats/${chatId}/participants`, {
      participant,
    });
  }

  async removeParticipant(chatId: string, participant: string): Promise<void> {
    await this.request("DELETE", `/chats/${chatId}/participants/${encodeURIComponent(participant)}`);
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  async sendMessage(params: LinqSendMessageParams): Promise<LinqMessage> {
    return this.request<LinqMessage>("POST", "/messages", params);
  }

  async getMessages(chatId: string, limit = 50): Promise<LinqMessage[]> {
    return this.request<LinqMessage[]>(
      "GET",
      `/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`,
    );
  }
}

// ── Webhook signature verification ────────────────────────────────────────

export function verifyLinqWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", params.secret)
    .update(params.rawBody, "utf8")
    .digest("hex");
  // Constant-time compare
  if (params.signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= params.signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function parseLinqWebhookEvent(body: unknown): LinqWebhookEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const evt = body as Record<string, unknown>;
  if (typeof evt["type"] !== "string") return null;
  return evt as unknown as LinqWebhookEvent;
}
