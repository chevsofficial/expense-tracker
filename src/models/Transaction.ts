import mongoose from "mongoose";
import { getModel } from "./_shared";

export type TransactionKind = "income" | "expense";

export type TransactionDoc = {
  workspaceId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId | null;
  amountMinor: number;
  currency: string;
  kind: TransactionKind;
  date: Date;
  note?: string;
  merchant?: string;
  receipts: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const TransactionSchema = new mongoose.Schema<TransactionDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true },
    kind: { type: String, enum: ["income", "expense"], required: true },
    date: { type: Date, required: true, index: true },
    note: { type: String },
    merchant: { type: String },
    receipts: { type: [String], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TransactionSchema.index({ workspaceId: 1, date: 1 });
TransactionSchema.index({ workspaceId: 1, categoryId: 1, date: 1 });

export const TransactionModel = getModel<TransactionDoc>("Transaction", TransactionSchema);
