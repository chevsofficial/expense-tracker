import mongoose from "mongoose";
import { getModel } from "./_shared";

export type CategoryKind = "income" | "expense" | "both";

export type CategoryDoc = {
  workspaceId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  nameKey?: string;
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
    nameKey: { type: String },
    nameCustom: { type: String },
    kind: { type: String, enum: ["income", "expense", "both"], default: "expense", required: true },
    sortOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Must have either nameKey or nameCustom
CategorySchema.pre("validate", function () {
  const doc = this as unknown as CategoryDoc;
  if (!doc.nameKey && !doc.nameCustom) {
    throw new Error("Category must have nameKey or nameCustom");
  }
});

CategorySchema.index({ workspaceId: 1, groupId: 1, nameKey: 1 }, { unique: true, sparse: true });
CategorySchema.index({ workspaceId: 1, groupId: 1, nameCustom: 1 }, { unique: true, sparse: true });

export const CategoryModel = getModel<CategoryDoc>("Category", CategorySchema);
