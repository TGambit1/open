import type { ObjectId } from "mongodb";
import { memoryCol } from "./collections.js";
import type { MemoryDoc, MemoryType } from "./schemas.js";

// ── Facts ──────────────────────────────────────────────────────────────────
// Structured durable knowledge: "kids.names", "allergies", "trash-day", etc.

export async function setFact(
  householdId: ObjectId,
  key: string,
  content: string,
  tags: string[] = [],
): Promise<MemoryDoc> {
  const now = new Date();
  const result = await memoryCol().findOneAndUpdate(
    { householdId, type: "fact", key },
    {
      $set: { content, tags, updatedAt: now },
      $setOnInsert: { householdId, type: "fact" as MemoryType, key, date: null, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function getFact(
  householdId: ObjectId,
  key: string,
): Promise<MemoryDoc | null> {
  return memoryCol().findOne({ householdId, type: "fact", key });
}

export async function getAllFacts(
  householdId: ObjectId,
): Promise<MemoryDoc[]> {
  return memoryCol()
    .find({ householdId, type: "fact" })
    .sort({ key: 1 })
    .toArray();
}

export async function deleteFact(
  householdId: ObjectId,
  key: string,
): Promise<void> {
  await memoryCol().deleteOne({ householdId, type: "fact", key });
}

// ── Notes ──────────────────────────────────────────────────────────────────
// Free-form durable notes ("remember this" from the group chat)

export async function addNote(
  householdId: ObjectId,
  content: string,
  tags: string[] = [],
): Promise<MemoryDoc> {
  const now = new Date();
  const doc: MemoryDoc = {
    householdId,
    type: "note",
    key: null,
    content,
    date: null,
    tags,
    createdAt: now,
    updatedAt: now,
  };
  const result = await memoryCol().insertOne(doc as MemoryDoc);
  return { ...doc, _id: result.insertedId };
}

export async function getNotes(
  householdId: ObjectId,
  limit = 50,
): Promise<MemoryDoc[]> {
  return memoryCol()
    .find({ householdId, type: "note" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function searchMemory(
  householdId: ObjectId,
  query: string,
  limit = 20,
): Promise<MemoryDoc[]> {
  return memoryCol()
    .find({
      householdId,
      content: { $regex: query, $options: "i" },
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

// ── Daily logs ─────────────────────────────────────────────────────────────
// Mirrors OpenClaw's memory/YYYY-MM-DD.md files, but stored in MongoDB

export async function upsertDailyLog(
  householdId: ObjectId,
  date: string,  // YYYY-MM-DD
  content: string,
): Promise<MemoryDoc> {
  const now = new Date();
  const result = await memoryCol().findOneAndUpdate(
    { householdId, type: "daily-log", date },
    {
      $set: { content, updatedAt: now },
      $setOnInsert: {
        householdId,
        type: "daily-log" as MemoryType,
        key: null,
        date,
        tags: [],
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function getDailyLog(
  householdId: ObjectId,
  date: string,
): Promise<MemoryDoc | null> {
  return memoryCol().findOne({ householdId, type: "daily-log", date });
}

export async function getRecentDailyLogs(
  householdId: ObjectId,
  limit = 7,
): Promise<MemoryDoc[]> {
  return memoryCol()
    .find({ householdId, type: "daily-log" })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Render all facts + recent daily logs as a markdown string —
 * compatible with OpenClaw's MEMORY.md format so the agent can read it.
 */
export async function buildMemoryMd(
  householdId: ObjectId,
): Promise<string> {
  const [facts, logs] = await Promise.all([
    getAllFacts(householdId),
    getRecentDailyLogs(householdId, 7),
  ]);

  const lines: string[] = ["# MEMORY\n"];

  if (facts.length > 0) {
    lines.push("## Household facts\n");
    for (const f of facts) {
      lines.push(`**${f.key}:** ${f.content}`);
    }
    lines.push("");
  }

  if (logs.length > 0) {
    lines.push("## Recent daily logs\n");
    for (const log of logs) {
      lines.push(`### ${log.date}\n\n${log.content}\n`);
    }
  }

  return lines.join("\n");
}
