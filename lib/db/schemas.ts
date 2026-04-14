import type { ObjectId } from "mongodb";
import type { LinqProtocol } from "../../extensions/linq/src/types.js";

// ── Households ─────────────────────────────────────────────────────────────

export type HouseholdDoc = {
  _id?: ObjectId;
  /** URL-friendly identifier, e.g. "smith-family" */
  slug: string;
  /** Display name shown on landing page */
  name: string;
  /** Avatar emoji */
  emoji: string;
  /** Short bio shown on landing page */
  bio: string;
  linq: {
    /** E.164 Linq from-number */
    fromNumber: string;
    /** Linq group chat ID created via create-group */
    groupChatId?: string;
    /** Preferred messaging protocol */
    defaultProtocol: LinqProtocol;
    /** E.164 phone numbers of household members */
    members: string[];
  };
  createdAt: Date;
  updatedAt: Date;
};

// ── Messages ───────────────────────────────────────────────────────────────

export type MessageDirection = "inbound" | "outbound";

export type MessageDoc = {
  _id?: ObjectId;
  householdId: ObjectId;
  /** Linq's own message ID — used for deduplication */
  linqMessageId: string;
  chatId: string;
  direction: MessageDirection;
  /** Sender E.164 number, or "home" for outbound agent messages */
  from: string;
  text: string | null;
  attachmentUrl: string | null;
  protocol: LinqProtocol;
  /** Linq message ID this is replying to */
  replyToMessageId: string | null;
  sentAt: Date;
  createdAt: Date;
};

// ── Memory ─────────────────────────────────────────────────────────────────

export type MemoryType = "fact" | "note" | "daily-log";

export type MemoryDoc = {
  _id?: ObjectId;
  householdId: ObjectId;
  type: MemoryType;
  /**
   * Dot-path key for facts, e.g. "kids.names", "allergies", "trash-day".
   * Null for notes and daily logs.
   */
  key: string | null;
  /** Markdown or plain-text content */
  content: string;
  /** ISO date string YYYY-MM-DD — set for daily-log entries */
  date: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

// ── Resources ──────────────────────────────────────────────────────────────

export type ResourceCategory =
  | "meal-plans"
  | "shopping"
  | "school"
  | "homework"
  | "helpers"
  | "home-maintenance"
  | "books"
  | "stories"
  | "checklists";

export type ResourceDoc = {
  _id?: ObjectId;
  householdId: ObjectId;
  category: ResourceCategory;
  /** Short name, e.g. "this-week", "child-a", "groceries" */
  name: string;
  /** Full markdown content */
  content: string;
  /** Arbitrary structured metadata for the category */
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};
