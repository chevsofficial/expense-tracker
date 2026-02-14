import mongoose from "mongoose";
import { getModel } from "./_shared";

export type TagDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  nameNormalized: string;
  color?: string | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const TagSchema = new mongoose.Schema<TagDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true },
    color: { type: String, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TagSchema.pre("validate", function normalizeTagName() {
  if (typeof this.name === "string") {
    this.name = this.name.trim();
    this.nameNormalized = normalizeName(this.name);
  }
});

TagSchema.index({ workspaceId: 1, nameNormalized: 1 }, { unique: true });

export const TagModel = getModel<TagDoc>("Tag", TagSchema);
export { normalizeName as normalizeTagName };
