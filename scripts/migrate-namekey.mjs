import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const normalizeNameKey = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const client = new MongoClient(uri);

const updateMissingNameKeys = async (collection, label) => {
  const cursor = collection.find({
    $or: [{ nameKey: { $exists: false } }, { nameKey: null }, { nameKey: "" }],
  });

  let updatedCount = 0;
  let skippedCount = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) break;

    const baseName = doc.nameCustom?.trim() || doc.nameKey?.trim();
    if (!baseName) {
      skippedCount += 1;
      continue;
    }

    const normalized = normalizeNameKey(baseName);
    if (!normalized) {
      skippedCount += 1;
      continue;
    }

    await collection.updateOne({ _id: doc._id }, { $set: { nameKey: normalized } });
    updatedCount += 1;
  }

  console.log(`✅ ${label}: updated ${updatedCount} docs, skipped ${skippedCount}.`);
  return { updatedCount, skippedCount };
};

try {
  await client.connect();
  const db = client.db();

  await updateMissingNameKeys(db.collection("categorygroups"), "Category groups");
  await updateMissingNameKeys(db.collection("categories"), "Categories");
} finally {
  await client.close();
}
