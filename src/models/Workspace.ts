import mongoose from "mongoose";
import { getModel } from "./_shared";

export type CurrencyCode = string; // ISO 4217 like "MXN", "USD"

export type WorkspaceDoc = {
  userId: mongoose.Types.ObjectId;
  name: string; // "Personal"
  defaultCurrency: CurrencyCode; // usually "MXN"
  createdAt: Date;
  updatedAt: Date;
};

const WorkspaceSchema = new mongoose.Schema<WorkspaceDoc>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    defaultCurrency: { type: String, required: true }
  },
  { timestamps: true }
);

WorkspaceSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WorkspaceModel = getModel<WorkspaceDoc>("Workspace", WorkspaceSchema);
