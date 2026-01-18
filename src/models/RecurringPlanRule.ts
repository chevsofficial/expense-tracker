import mongoose from "mongoose";
import { getModel } from "./_shared";

export type IntervalMonths = 1 | 2 | 3 | 6 | 12;

export type RecurringPlanRuleDoc = {
  workspaceId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;

  intervalMonths: IntervalMonths;

  // When rule starts (e.g., 2026-01)
  startYear: number;
  startMonth: number;

  // Next month we should apply it to
  nextRunYear: number;
  nextRunMonth: number;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const RecurringPlanRuleSchema = new mongoose.Schema<RecurringPlanRuleDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },

    intervalMonths: { type: Number, enum: [1, 2, 3, 6, 12], required: true },

    startYear: { type: Number, required: true },
    startMonth: { type: Number, required: true },

    nextRunYear: { type: Number, required: true },
    nextRunMonth: { type: Number, required: true },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

RecurringPlanRuleSchema.index({ workspaceId: 1, isActive: 1 });

export const RecurringPlanRuleModel = getModel<RecurringPlanRuleDoc>(
  "RecurringPlanRule",
  RecurringPlanRuleSchema
);
