import mongoose from "mongoose";
import { getModel } from "./_shared";

export type CategoryGroupDoc = {
  workspaceId: mongoose.Types.ObjectId;
  nameKey: string; // e.g. "home"
  nameCustom?: string; // user-entered name
  sortOrder: number;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const CategoryGroupSchema = new mongoose.Schema<CategoryGroupDoc>(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    nameKey: { type: String, required: true, trim: true, lowercase: true },
    nameCustom: { type: String },
    sortOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Must have either nameKey or nameCustom
const normalizeNameKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");

CategoryGroupSchema.pre("validate", function () {
  const doc = this as unknown as CategoryGroupDoc;
  const baseName = doc.nameCustom?.trim() ? doc.nameCustom : doc.nameKey;
  if (!baseName) {
    throw new Error("CategoryGroup must have nameKey or nameCustom");
  }

  const normalized = normalizeNameKey(baseName);
  if (!normalized) {
    throw new Error("CategoryGroup must have a valid nameKey");
  }
  doc.nameKey = normalized;
});

CategoryGroupSchema.index({ workspaceId: 1, nameKey: 1 }, { unique: true });
CategoryGroupSchema.index({ workspaceId: 1, nameCustom: 1 }, { unique: true, sparse: true });

export const CategoryGroupModel = getModel<CategoryGroupDoc>("CategoryGroup", CategoryGroupSchema);
