import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env["MONGODB_URI"];

if (!uri) {
  throw new Error(
    "MONGODB_URI is not set. Add it to your environment variables.\n" +
    "Get a free URI from https://mongodb.com/atlas",
  );
}

/**
 * Singleton MongoClient.
 * In long-running server processes (gateway daemon) this stays open.
 * In short-lived scripts call client.close() when done.
 */
let _client: MongoClient | null = null;

export function getClient(): MongoClient {
  if (!_client) {
    _client = new MongoClient(uri!, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  return _client;
}

export async function connectDb(): Promise<MongoClient> {
  const client = getClient();
  await client.connect();
  return client;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
  }
}

export function getDb(dbName = "home") {
  return getClient().db(dbName);
}
