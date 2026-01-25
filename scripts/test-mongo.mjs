import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const client = new MongoClient(uri);

try {
  await client.connect();
  await client.db().command({ ping: 1 });
  console.log("✅ Mongo connection OK");
} finally {
  await client.close();
}
