#!/usr/bin/env node
/**
 * Quick Atlas connection test — run with:
 *   node --env-file=.env scripts/test-db.mjs
 */
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not set");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

try {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("✓ Connected to MongoDB Atlas — Home database is ready");
} catch (err) {
  console.error("✗ Connection failed:", err.message);
  process.exit(1);
} finally {
  await client.close();
}
