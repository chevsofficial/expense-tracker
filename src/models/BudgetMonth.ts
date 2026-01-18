import mongoose from "mongoose";
import { getModel } from "./_shared";

export type PlannedLine = {
  categoryId: mongoose.Types.ObjectId;
  amount: number;
  currency: string; // allow planning in USD or MXN; convert via FxRateMonth for totals
};

export type BudgetMonthDoc = {
  workspaceId: mongoose.Types.ObjectId;
  year: number;
  month: number; // 1-12
  plannedLines: PlannedLine[];
  createdAt: Date;
  updatedAt: Date;
};

const PlannedLineSchema = new mongoose.Schema<PlannedLine>(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true }
  },
  { _id: false }
);

const BudgetMonthSchema = new mongoose.Schema<BudgetMonthDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    plannedLines: { type: [PlannedLineSchema], default: [] }
  },
  { timestamps: true }
);

BudgetMonthSchema.index({ workspaceId: 1, year: 1, month: 1 }, { unique: true });

export const BudgetMonthModel = getModel<BudgetMonthDoc>("BudgetMonth", BudgetMonthSchema);
