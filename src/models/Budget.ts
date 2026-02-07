import mongoose from "mongoose";
import { getModel } from "./_shared";

export type BudgetType = "monthly" | "custom";

export type CategoryBudget = {
  categoryId: mongoose.Types.ObjectId;
  amountMinor: number;
};

export type BudgetDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  emoji?: string | null;
  color?: string | null;
  type: BudgetType;
  startMonth?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  categoryIds: mongoose.Types.ObjectId[] | null;
  accountIds: mongoose.Types.ObjectId[] | null;
  categoryBudgets: CategoryBudget[];
  totalBudgetMinor: number;
  pinnedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const CategoryBudgetSchema = new mongoose.Schema<CategoryBudget>(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    amountMinor: { type: Number, required: true },
  },
  { _id: false }
);

const BudgetSchema = new mongoose.Schema<BudgetDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    name: { type: String, required: true },
    emoji: { type: String, default: null },
    color: { type: String, default: null },
    type: { type: String, enum: ["monthly", "custom"], required: true },
    startMonth: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    categoryIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Category", default: null },
    accountIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Account", default: null },
    categoryBudgets: { type: [CategoryBudgetSchema], default: [] },
    totalBudgetMinor: { type: Number, required: true, default: 0 },
    pinnedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BudgetSchema.index({ workspaceId: 1, archivedAt: 1 });
BudgetSchema.index({ workspaceId: 1, pinnedAt: 1 });

export const BudgetModel = getModel<BudgetDoc>("Budget", BudgetSchema);
