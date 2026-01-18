import mongoose from "mongoose";
import { getModel } from "./_shared";

export type TransactionType = "income" | "expense";

export type ReceiptMeta = {
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: Date;
};

export type TransactionDoc = {
  workspaceId: mongoose.Types.ObjectId;
  type: TransactionType;
  date: Date;
  amount: number;     // positive number; type determines +/-
  currency: string;   // "USD", "MXN"
  categoryId: mongoose.Types.ObjectId; // REQUIRED for all
  merchant?: string;
  note?: string;
  receipt?: ReceiptMeta;
  createdAt: Date;
  updatedAt: Date;
};

const ReceiptSchema = new mongoose.Schema<ReceiptMeta>(
  {
    url: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date }
  },
  { _id: false }
);

const TransactionSchema = new mongoose.Schema<TransactionDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    merchant: { type: String },
    note: { type: String },
    receipt: { type: ReceiptSchema }
  },
  { timestamps: true }
);

TransactionSchema.index({ workspaceId: 1, date: -1 });

export const TransactionModel = getModel<TransactionDoc>("Transaction", TransactionSchema);
