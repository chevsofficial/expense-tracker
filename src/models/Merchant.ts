import mongoose from "mongoose";
import { getModel } from "./_shared";

export type MerchantDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  nameKey: string;
  aliases?: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const normalizeMerchantNameKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const MerchantSchema = new mongoose.Schema<MerchantDoc>(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, trim: true, lowercase: true },
    aliases: { type: [String], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MerchantSchema.pre("validate", function () {
  const doc = this as unknown as MerchantDoc;
  const baseName = doc.name?.trim();
  if (!baseName) {
    throw new Error("Merchant name is required");
  }
  const normalized = normalizeMerchantNameKey(baseName);
  if (!normalized) {
    throw new Error("Merchant must have a valid nameKey");
  }
  doc.nameKey = normalized;
  if (Array.isArray(doc.aliases)) {
    doc.aliases = doc.aliases
      .map((alias) => alias.trim().toLowerCase())
      .filter((alias) => alias.length > 0);
  }
});

MerchantSchema.index({ workspaceId: 1, nameKey: 1 }, { unique: true });

export const MerchantModel = getModel<MerchantDoc>("Merchant", MerchantSchema);
