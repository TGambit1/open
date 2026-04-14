import type { ObjectId } from "mongodb";
import { resourcesCol } from "./collections.js";
import type { ResourceDoc, ResourceCategory } from "./schemas.js";

/** Upsert a resource by household + category + name */
export async function upsertResource(
  householdId: ObjectId,
  category: ResourceCategory,
  name: string,
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<ResourceDoc> {
  const now = new Date();
  const result = await resourcesCol().findOneAndUpdate(
    { householdId, category, name },
    {
      $set: { content, metadata, updatedAt: now },
      $setOnInsert: { householdId, category, name, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result!;
}

export async function getResource(
  householdId: ObjectId,
  category: ResourceCategory,
  name: string,
): Promise<ResourceDoc | null> {
  return resourcesCol().findOne({ householdId, category, name });
}

export async function listResources(
  householdId: ObjectId,
  category: ResourceCategory,
): Promise<ResourceDoc[]> {
  return resourcesCol()
    .find({ householdId, category })
    .sort({ name: 1 })
    .toArray();
}

export async function deleteResource(
  householdId: ObjectId,
  category: ResourceCategory,
  name: string,
): Promise<void> {
  await resourcesCol().deleteOne({ householdId, category, name });
}

// ── Category-specific helpers ──────────────────────────────────────────────

export async function getThisWeekMealPlan(
  householdId: ObjectId,
): Promise<ResourceDoc | null> {
  return getResource(householdId, "meal-plans", "this-week");
}

export async function getCurrentGroceryList(
  householdId: ObjectId,
): Promise<ResourceDoc | null> {
  return getResource(householdId, "shopping", "groceries");
}

export async function getCurrentSchoolNotices(
  householdId: ObjectId,
): Promise<ResourceDoc | null> {
  return getResource(householdId, "school", "current-notices");
}

export async function getHelperContacts(
  householdId: ObjectId,
): Promise<ResourceDoc | null> {
  return getResource(householdId, "helpers", "contacts");
}

export async function getMaintenanceSchedule(
  householdId: ObjectId,
): Promise<ResourceDoc | null> {
  return getResource(householdId, "home-maintenance", "schedule");
}

/**
 * Render all resources in a category as a single markdown string —
 * useful for injecting into the agent's session context.
 */
export async function renderCategory(
  householdId: ObjectId,
  category: ResourceCategory,
): Promise<string> {
  const docs = await listResources(householdId, category);
  if (docs.length === 0) return `# ${category}\n\n_(no entries yet)_`;
  return docs
    .map((d) => `## ${d.name}\n\n${d.content}`)
    .join("\n\n---\n\n");
}
