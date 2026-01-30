import mongoose from "mongoose";
import { getModel } from "./_shared";

export type RecurringSchedule = {
  cadence: "monthly";
  dayOfMonth: number;
};

export type RecurringDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  amountMinor: number;
  currency: string;
  kind: "expense" | "income";
  categoryId?: mongoose.Types.ObjectId | null;
  schedule: RecurringSchedule;
  nextRunDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const RecurringScheduleSchema = new mongoose.Schema<RecurringSchedule>(
  {
    cadence: { type: String, enum: ["monthly"], required: true },
    dayOfMonth: { type: Number, required: true },
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
    schedule: { type: RecurringScheduleSchema, required: true },
    nextRunDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RecurringSchema.index({ workspaceId: 1, isActive: 1 });

export const RecurringModel = getModel<RecurringDoc>("Recurring", RecurringSchema);
