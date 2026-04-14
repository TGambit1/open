import type { ObjectId } from "mongodb";
import { messagesCol } from "./collections.js";
import type { MessageDoc, MessageDirection } from "./schemas.js";
import type { LinqMessage, LinqProtocol } from "../../extensions/linq/src/types.js";

/** Persist an inbound Linq message. Skips duplicate linqMessageId silently. */
export async function saveInboundMessage(
  householdId: ObjectId,
  msg: LinqMessage,
): Promise<MessageDoc | null> {
  const doc: MessageDoc = {
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
  };

  try {
    const result = await messagesCol().insertOne(doc as MessageDoc);
    return { ...doc, _id: result.insertedId };
  } catch (err: unknown) {
    // Duplicate key = already stored, not an error
    if (isDuplicateKeyError(err)) return null;
    throw err;
  }
}

/** Persist an outbound message sent by the Home agent */
export async function saveOutboundMessage(params: {
  householdId: ObjectId;
  linqMessageId: string;
  chatId: string;
  text: string | null;
  attachmentUrl?: string | null;
  protocol: LinqProtocol;
  replyToMessageId?: string | null;
  sentAt?: Date;
}): Promise<MessageDoc> {
  const now = new Date();
  const doc: MessageDoc = {
    householdId: params.householdId,
    linqMessageId: params.linqMessageId,
    chatId: params.chatId,
    direction: "outbound",
    from: "home",
    text: params.text,
    attachmentUrl: params.attachmentUrl ?? null,
    protocol: params.protocol,
    replyToMessageId: params.replyToMessageId ?? null,
    sentAt: params.sentAt ?? now,
    createdAt: now,
  };
  const result = await messagesCol().insertOne(doc as MessageDoc);
  return { ...doc, _id: result.insertedId };
}

/** Fetch the N most recent messages for a household, newest first */
export async function getRecentMessages(
  householdId: ObjectId,
  limit = 50,
): Promise<MessageDoc[]> {
  return messagesCol()
    .find({ householdId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .toArray();
}

/** Fetch messages for a specific chat thread, newest first */
export async function getChatHistory(
  chatId: string,
  limit = 100,
): Promise<MessageDoc[]> {
  return messagesCol()
    .find({ chatId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .toArray();
}

/** Search messages by text content (requires a text index if large volume) */
export async function searchMessages(
  householdId: ObjectId,
  query: string,
  limit = 20,
): Promise<MessageDoc[]> {
  return messagesCol()
    .find({
      householdId,
      text: { $regex: query, $options: "i" },
    })
    .sort({ sentAt: -1 })
    .limit(limit)
    .toArray();
}

/** Count messages by direction for a household */
export async function getMessageStats(householdId: ObjectId): Promise<{
  inbound: number;
  outbound: number;
  total: number;
}> {
  const [inbound, outbound] = await Promise.all([
    messagesCol().countDocuments({ householdId, direction: "inbound" as MessageDirection }),
    messagesCol().countDocuments({ householdId, direction: "outbound" as MessageDirection }),
  ]);
  return { inbound, outbound, total: inbound + outbound };
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}
