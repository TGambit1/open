export { connectDb, closeDb, getDb, getClient } from "./client.js";
export { ensureIndexes } from "./collections.js";

export {
  createHousehold,
  getHousehold,
  getHouseholdBySlug,
  updateHousehold,
  setGroupChatId,
  addMember,
  removeMember,
  getLandingProfile,
} from "./households.js";

export {
  saveInboundMessage,
  saveOutboundMessage,
  getRecentMessages,
  getChatHistory,
  searchMessages,
  getMessageStats,
} from "./messages.js";

export {
  setFact,
  getFact,
  getAllFacts,
  deleteFact,
  addNote,
  getNotes,
  searchMemory,
  upsertDailyLog,
  getDailyLog,
  getRecentDailyLogs,
  buildMemoryMd,
} from "./memory.js";

export {
  upsertResource,
  getResource,
  listResources,
  deleteResource,
  renderCategory,
  getThisWeekMealPlan,
  getCurrentGroceryList,
  getCurrentSchoolNotices,
  getHelperContacts,
  getMaintenanceSchedule,
} from "./resources.js";

export type {
  HouseholdDoc,
  MessageDoc,
  MessageDirection,
  MemoryDoc,
  MemoryType,
  ResourceDoc,
  ResourceCategory,
} from "./schemas.js";
