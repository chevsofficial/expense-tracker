import mongoose from "mongoose";
import { getModel } from "./_shared";

export type RecurringSchedule = {
  frequency: "monthly" | "weekly";
  interval: number;
  dayOfMonth?: number;
};

export type RecurringDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  amountMinor: number;
  currency: string;
  kind: "expense" | "income";
  categoryId?: mongoose.Types.ObjectId | null;
  merchantId?: mongoose.Types.ObjectId | null;
  schedule: RecurringSchedule;
  startDate: Date;
  nextRunAt: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const RecurringScheduleSchema = new mongoose.Schema<RecurringSchedule>(
  {
    frequency: { type: String, enum: ["monthly", "weekly"], required: true },
    interval: { type: Number, required: true },
    dayOfMonth: { type: Number },
  },
  { _id: false }
);

const RecurringSchema = new mongoose.Schema<RecurringDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true },
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true },
    kind: { type: String, enum: ["expense", "income"], required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", default: null },
    schedule: { type: RecurringScheduleSchema, required: true },
    startDate: { type: Date, required: true },
    nextRunAt: { type: Date, required: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RecurringSchema.index({ workspaceId: 1, isArchived: 1 });

export const RecurringModel = getModel<RecurringDoc>("Recurring", RecurringSchema);
