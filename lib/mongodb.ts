/**
 * MongoDB Native Driver Client
 * Replaces Prisma for all database operations.
 * Works with standalone MongoDB (no replica set required).
 */
import { MongoClient, ObjectId, Db } from 'mongodb';

// Singleton pattern for Next.js hot-reload
const globalWithMongo = globalThis as typeof globalThis & { _mongoClient?: MongoClient };

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  const mongoUri = process.env.MONGODB_URI;
  if (process.env.NODE_ENV === 'development') {
    if (!globalWithMongo._mongoClient) {
      globalWithMongo._mongoClient = new MongoClient(mongoUri);
    }
    return globalWithMongo._mongoClient.connect();
  }
  return new MongoClient(mongoUri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const mongoUri = process.env.MONGODB_URI!;
  const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'blacktrucks';
  return client.db(dbName);
}

export { ObjectId };

// ─── Helper: convert MongoDB _id to id string ────────────────────────────────
export function toId(doc: any) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toString() };
}

export function toIds(docs: any[]) {
  return docs.map(toId);
}

// ─── Helper: parse ObjectId safely ───────────────────────────────────────────
export function parseId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/** Parse an id that is already known to be valid (e.g. from a DB document field).
 *  Returns undefined (not null) so it is safe to use directly in Mongo filters. */
export function oid(id: string | undefined | null): ObjectId | undefined {
  if (!id) return undefined;
  try {
    return new ObjectId(id);
  } catch {
    return undefined;
  }
}
