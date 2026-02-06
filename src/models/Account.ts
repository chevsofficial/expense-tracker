import mongoose from "mongoose";
import { getModel } from "./_shared";

export type AccountType = "cash" | "bank" | "investment" | "credit" | "other";

export type AccountDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  type?: AccountType | null;
  currency?: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const AccountSchema = new mongoose.Schema<AccountDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["cash", "bank", "investment", "credit", "other"], default: null },
    currency: { type: String, default: null },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AccountSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const AccountModel = getModel<AccountDoc>("Account", AccountSchema);
