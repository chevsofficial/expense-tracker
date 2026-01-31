import mongoose from "mongoose";
import { getModel } from "./_shared";

export type CategoryKind = "income" | "expense";

export type CategoryDoc = {
  workspaceId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  nameKey: string;
  nameCustom?: string;
  kind: CategoryKind;
  sortOrder: number;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const CategorySchema = new mongoose.Schema<CategoryDoc>(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryGroup",
      required: true,
      index: true,
    },
    nameKey: { type: String, required: true, trim: true, lowercase: true },
    nameCustom: { type: String },
    kind: { type: String, enum: ["income", "expense"], default: "expense", required: true },
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

CategorySchema.pre("validate", function () {
  const doc = this as unknown as CategoryDoc;
  const baseName = doc.nameCustom?.trim() ? doc.nameCustom : doc.nameKey;
  if (!baseName) {
    throw new Error("Category must have nameKey or nameCustom");
  }

  const normalized = normalizeNameKey(baseName);
  if (!normalized) {
    throw new Error("Category must have a valid nameKey");
  }
  doc.nameKey = normalized;
});

CategorySchema.index({ workspaceId: 1, groupId: 1, nameKey: 1 }, { unique: true });
CategorySchema.index({ workspaceId: 1, groupId: 1, nameCustom: 1 }, { unique: true, sparse: true });

export const CategoryModel = getModel<CategoryDoc>("Category", CategorySchema);
