import type { ObjectId } from "mongodb";
import { householdsCol } from "./collections.js";
import type { HouseholdDoc } from "./schemas.js";

export async function createHousehold(
  data: Omit<HouseholdDoc, "_id" | "createdAt" | "updatedAt">,
): Promise<HouseholdDoc> {
  const now = new Date();
  const doc: HouseholdDoc = { ...data, createdAt: now, updatedAt: now };
  const result = await householdsCol().insertOne(doc as HouseholdDoc);
  return { ...doc, _id: result.insertedId };
}

export async function getHousehold(
  id: ObjectId,
): Promise<HouseholdDoc | null> {
  return householdsCol().findOne({ _id: id });
}

export async function getHouseholdBySlug(
  slug: string,
): Promise<HouseholdDoc | null> {
  return householdsCol().findOne({ slug });
}

export async function updateHousehold(
  id: ObjectId,
  patch: Partial<Omit<HouseholdDoc, "_id" | "createdAt">>,
): Promise<HouseholdDoc | null> {
  const result = await householdsCol().findOneAndUpdate(
    { _id: id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ?? null;
}

/** Update just the Linq group chat ID after create-group runs */
export async function setGroupChatId(
  id: ObjectId,
  groupChatId: string,
): Promise<void> {
  await householdsCol().updateOne(
    { _id: id },
    { $set: { "linq.groupChatId": groupChatId, updatedAt: new Date() } },
  );
}

/** Add a member phone number (E.164) to the household */
export async function addMember(
  id: ObjectId,
  phoneNumber: string,
): Promise<void> {
  await householdsCol().updateOne(
    { _id: id },
    {
      $addToSet: { "linq.members": phoneNumber },
      $set: { updatedAt: new Date() },
    },
  );
}

/** Remove a member phone number from the household */
export async function removeMember(
  id: ObjectId,
  phoneNumber: string,
): Promise<void> {
  await householdsCol().updateOne(
    { _id: id },
    {
      $pull: { "linq.members": phoneNumber },
      $set: { updatedAt: new Date() },
    },
  );
}

/** Return minimal profile data for the landing page */
export async function getLandingProfile(slug: string): Promise<{
  name: string;
  emoji: string;
  bio: string;
  phoneNumber: string;
  groupChatId?: string;
} | null> {
  const doc = await householdsCol().findOne(
    { slug },
    {
      projection: {
        name: 1,
        emoji: 1,
        bio: 1,
        "linq.fromNumber": 1,
        "linq.groupChatId": 1,
      },
    },
  );
  if (!doc) return null;
  return {
    name: doc.name,
    emoji: doc.emoji,
    bio: doc.bio,
    phoneNumber: doc.linq.fromNumber,
    groupChatId: doc.linq.groupChatId,
  };
}
