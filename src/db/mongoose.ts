import mongoose from "mongoose";
import { TransactionModel } from "@/src/models/Transaction";

/**
 * Prevent multiple connections during Next.js hot reload (dev)
 */
declare global {
  var _mongoose:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

global._mongoose ||= { conn: null, promise: null };

let hasRunIndexMigrations = false;

async function runIndexMigrations() {
  if (hasRunIndexMigrations || process.env.RUN_INDEX_MIGRATIONS !== "1") return;

  const indexName = "workspaceId_1_sourceRecurringId_1_sourceOccurrenceOn_1";

  try {
    await TransactionModel.collection.dropIndex(indexName);
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 27) {
      throw error;
    }
  }

  await TransactionModel.collection.createIndex(
    { workspaceId: 1, sourceRecurringId: 1, sourceOccurrenceOn: 1 },
    {
      name: indexName,
      unique: true,
      partialFilterExpression: {
        sourceRecurringId: { $exists: true, $ne: null },
        sourceOccurrenceOn: { $exists: true, $ne: null },
      },
    }
  );

  hasRunIndexMigrations = true;
}

export async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }

  if (global._mongoose?.conn) return global._mongoose.conn;

  if (!global._mongoose?.promise) {
    global._mongoose!.promise = mongoose
      .connect(MONGODB_URI, { dbName: "expense-tracker" })
      .then((m) => m);
  }

  global._mongoose!.conn = await global._mongoose!.promise;
  await runIndexMigrations();
  return global._mongoose!.conn;
}
