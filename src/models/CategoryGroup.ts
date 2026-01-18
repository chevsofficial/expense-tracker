import mongoose from "mongoose";
import { getModel } from "./_shared";

export type CategoryGroupDoc = {
  workspaceId: mongoose.Types.ObjectId;
  nameKey?: string; // e.g. "categoryGroup.home"
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
    nameKey: { type: String },
    nameCustom: { type: String },
    sortOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Must have either nameKey or nameCustom
CategoryGroupSchema.pre("validate", function () {
  const doc = this as unknown as CategoryGroupDoc;
  if (!doc.nameKey && !doc.nameCustom) {
    throw new Error("CategoryGroup must have nameKey or nameCustom");
  }
});

CategoryGroupSchema.index({ workspaceId: 1, nameKey: 1 }, { unique: true, sparse: true });
CategoryGroupSchema.index({ workspaceId: 1, nameCustom: 1 }, { unique: true, sparse: true });

export const CategoryGroupModel = getModel<CategoryGroupDoc>("CategoryGroup", CategoryGroupSchema);
