import mongoose from "mongoose";
import { getModel } from "./_shared";

export type TransactionKind = "income" | "expense" | "transfer";
export type TransferSide = "out" | "in";

export type TransactionDoc = {
  workspaceId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId | null;
  categoryId: mongoose.Types.ObjectId | null;
  amountMinor: number;
  currency: string;
  kind: TransactionKind;
  transferId?: mongoose.Types.ObjectId | null;
  transferSide?: TransferSide | null;
  transferAccountId?: mongoose.Types.ObjectId | null;
  date: Date;
  note?: string;
  merchantId?: mongoose.Types.ObjectId | null;
  merchantNameSnapshot?: string | null;
  tagIds: mongoose.Types.ObjectId[];
  receiptUrls: string[];
  isPending?: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const TransactionSchema = new mongoose.Schema<TransactionDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true },
    kind: { type: String, enum: ["income", "expense", "transfer"], required: true },
    transferId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    transferSide: { type: String, enum: ["out", "in"], default: null },
    transferAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    date: { type: Date, required: true, index: true },
    note: { type: String },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", default: null },
    merchantNameSnapshot: { type: String },
    tagIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Tag", default: [] },
    receiptUrls: { type: [String], default: [] },
    isPending: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TransactionSchema.index({ workspaceId: 1, date: 1 });
TransactionSchema.index({ workspaceId: 1, categoryId: 1, date: 1 });
TransactionSchema.index({ workspaceId: 1, accountId: 1, date: 1 });
TransactionSchema.index({ workspaceId: 1, transferId: 1 });
TransactionSchema.index({ workspaceId: 1, tagIds: 1 });

export const TransactionModel = getModel<TransactionDoc>("Transaction", TransactionSchema);
