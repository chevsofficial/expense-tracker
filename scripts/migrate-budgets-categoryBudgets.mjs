import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
  const budgets = db.collection("budgets");

  const result = await budgets.updateMany(
    { categoryBudgets: { $exists: false } },
    { $set: { categoryBudgets: [] } }
  );

  console.log(`Updated budgets: ${result.modifiedCount}`);
} finally {
  await client.close();
}
