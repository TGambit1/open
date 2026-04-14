import type { Collection } from "mongodb";
import { getDb } from "./client.js";
import type { HouseholdDoc, MessageDoc, MemoryDoc, ResourceDoc } from "./schemas.js";

export function householdsCol(): Collection<HouseholdDoc> {
  return getDb().collection<HouseholdDoc>("households");
}

export function messagesCol(): Collection<MessageDoc> {
  return getDb().collection<MessageDoc>("messages");
}

export function memoryCol(): Collection<MemoryDoc> {
  return getDb().collection<MemoryDoc>("memory");
}

export function resourcesCol(): Collection<ResourceDoc> {
  return getDb().collection<ResourceDoc>("resources");
}

/**
 * Create all indexes. Call once at startup (idempotent).
 */
export async function ensureIndexes(): Promise<void> {
  await Promise.all([
    // households — unique slug
    householdsCol().createIndex({ slug: 1 }, { unique: true }),

    // messages — dedup by Linq message ID, fast lookup by chat + time
    messagesCol().createIndex({ linqMessageId: 1 }, { unique: true }),
    messagesCol().createIndex({ householdId: 1, sentAt: -1 }),
    messagesCol().createIndex({ chatId: 1, sentAt: -1 }),

    // memory — lookup by household + type + key; TTL not set (durable)
    memoryCol().createIndex({ householdId: 1, type: 1, key: 1 }),
    memoryCol().createIndex({ householdId: 1, date: -1 }),
    memoryCol().createIndex({ householdId: 1, tags: 1 }),

    // resources — lookup by household + category + name
    resourcesCol().createIndex(
      { householdId: 1, category: 1, name: 1 },
      { unique: true },
    ),
  ]);
}
