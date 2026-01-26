import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";
import { getModel } from "./_shared";

export type CurrencyCode = string; // ISO 4217 like "MXN", "USD"

// 1) Define schema first
const WorkspaceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    defaultCurrency: { type: String, required: true },
  },
  { timestamps: true }
);

WorkspaceSchema.index({ userId: 1, name: 1 }, { unique: true });

// 2) Infer the "data shape" from the schema
type Workspace = InferSchemaType<typeof WorkspaceSchema>;

// 3) HydratedDocument adds _id, id, save(), etc.
export type WorkspaceDoc = HydratedDocument<Workspace>;

// 4) Use getModel helper to avoid overwrite errors in dev/hot reload
export const WorkspaceModel = getModel<WorkspaceDoc>("Workspace", WorkspaceSchema);
