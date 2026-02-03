import mongoose from "mongoose";
import { getModel } from "./_shared";
import type { DashboardMetricType, DashboardWidgetView } from "@/src/dashboard/widgetTypes";

export type DashboardWidgetDoc = {
  id: string;
  type: DashboardMetricType;
  titleKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
  view: DashboardWidgetView;
  currency?: string;
  kind?: "income" | "expense";
  limit?: number;
};

export type DashboardConfigDoc = {
  workspaceId: mongoose.Types.ObjectId;
  version: number;
  layout: DashboardWidgetDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const DashboardWidgetSchema = new mongoose.Schema<DashboardWidgetDoc>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    titleKey: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
    view: { type: String, enum: ["card", "table", "bar", "pie"], required: true },
    currency: { type: String },
    kind: { type: String, enum: ["income", "expense"] },
    limit: { type: Number },
  },
  { _id: false }
);

const DashboardConfigSchema = new mongoose.Schema<DashboardConfigDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    version: { type: Number, default: 1 },
    layout: { type: [DashboardWidgetSchema], default: [] },
  },
  { timestamps: true }
);

DashboardConfigSchema.index({ workspaceId: 1 }, { unique: true });

export const DashboardConfigModel = getModel<DashboardConfigDoc>(
  "DashboardConfig",
  DashboardConfigSchema
);
