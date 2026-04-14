// Linq API types — https://apidocs.linqapp.com

export type LinqProtocol = "imessage" | "rcs" | "sms" | "mms";

// ── Chats ──────────────────────────────────────────────────────────────────

export type LinqCreateChatParams = {
  /** Phone numbers or Apple IDs of participants (E.164 format for SMS/MMS/RCS) */
  participants: string[];
  /** Preferred protocol. Falls back to SMS if iMessage/RCS unavailable. */
  protocol?: LinqProtocol;
  /** Optional display name for group chats */
  groupName?: string;
};

export type LinqChat = {
  id: string;
  participants: string[];
  protocol: LinqProtocol;
  groupName?: string;
  createdAt: string;
};

// ── Messages ───────────────────────────────────────────────────────────────

export type LinqSendMessageParams = {
  chatId: string;
  text?: string;
  attachmentUrl?: string;
  /** Thread a reply to a specific message */
  replyToMessageId?: string;
};

export type LinqMessage = {
  id: string;
  chatId: string;
  from: string;
  text?: string;
  attachmentUrl?: string;
  protocol: LinqProtocol;
  sentAt: string;
  replyToMessageId?: string;
};

// ── Webhook payloads ───────────────────────────────────────────────────────

export type LinqWebhookEvent =
  | LinqMessageReceivedEvent
  | LinqReactionEvent
  | LinqReadReceiptEvent;

export type LinqMessageReceivedEvent = {
  type: "message.received";
  message: LinqMessage;
};

export type LinqReactionEvent = {
  type: "message.reaction";
  messageId: string;
  chatId: string;
  from: string;
  reaction: string;
  sentAt: string;
};

export type LinqReadReceiptEvent = {
  type: "message.read";
  chatId: string;
  readBy: string;
  readAt: string;
};

// ── Config ─────────────────────────────────────────────────────────────────

export type LinqAccountConfig = {
  /** Linq API bearer token */
  apiToken?: string;
  /** HMAC secret used to verify webhook signatures */
  webhookSecret?: string;
  /** Your Linq phone number (E.164) that Home texts from */
  fromNumber?: string;
  /** The household group chat ID (created during setup) */
  groupChatId?: string;
  /** Preferred protocol for new chats */
  defaultProtocol?: LinqProtocol;
  /** Allow messages from any sender (default: paired numbers only) */
  dmPolicy?: "open" | "paired";
};
