import mongoose from "mongoose";
import { getModel } from "./_shared";

export type PlannedLine = {
  categoryId: mongoose.Types.ObjectId;
  plannedAmountMinor: number;
  kind?: "expense" | "income";
};

export type BudgetMonthDoc = {
  workspaceId: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  currency: string;
  plannedLines: PlannedLine[];
  createdAt: Date;
  updatedAt: Date;
};

const PlannedLineSchema = new mongoose.Schema<PlannedLine>(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    plannedAmountMinor: { type: Number, required: true },
    kind: { type: String, enum: ["expense", "income"], default: "expense" },
  },
  { _id: false }
);

const BudgetMonthSchema = new mongoose.Schema<BudgetMonthDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    month: { type: String, required: true },
    currency: { type: String, required: true },
    plannedLines: { type: [PlannedLineSchema], default: [] },
  },
  { timestamps: true }
);

BudgetMonthSchema.index({ workspaceId: 1, month: 1 }, { unique: true });

export const BudgetMonthModel = getModel<BudgetMonthDoc>("BudgetMonth", BudgetMonthSchema);
