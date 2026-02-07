import mongoose from "mongoose";
import { getModel } from "./_shared";

export type BudgetType = "monthly" | "custom";

export type BudgetAlertSettings = {
  enabled: boolean;
  thresholds: number[];
};

export type BudgetDoc = {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  emoji?: string | null;
  color?: string | null;
  isDefault: boolean;
  type: BudgetType;
  month?: string | null;
  startDate: Date;
  endDate: Date;
  categoryIds: mongoose.Types.ObjectId[] | null;
  accountIds: mongoose.Types.ObjectId[] | null;
  limitAmount: number | null;
  alerts?: BudgetAlertSettings;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const BudgetAlertSchema = new mongoose.Schema<BudgetAlertSettings>(
  {
    enabled: { type: Boolean, default: true },
    thresholds: { type: [Number], default: [75, 90, 100] },
  },
  { _id: false }
);

const BudgetSchema = new mongoose.Schema<BudgetDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    name: { type: String, required: true },
    emoji: { type: String, default: null },
    color: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
    type: { type: String, enum: ["monthly", "custom"], required: true },
    month: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    categoryIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Category", default: null },
    accountIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Account", default: null },
    limitAmount: { type: Number, default: null },
    alerts: { type: BudgetAlertSchema, default: { enabled: true, thresholds: [75, 90, 100] } },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

BudgetSchema.index({ workspaceId: 1, isDefault: 1 });
BudgetSchema.index({ workspaceId: 1, archivedAt: 1 });

export const BudgetModel = getModel<BudgetDoc>("Budget", BudgetSchema);
