import mongoose from "mongoose";
import { getModel } from "./_shared";

export type FxRate = {
  fromCurrency: string; // "USD"
  toCurrency: string;   // "MXN"
  rate: number;         // 17.20
};

export type FxRateMonthDoc = {
  workspaceId: mongoose.Types.ObjectId;
  year: number;
  month: number; // 1-12
  rates: FxRate[];
  createdAt: Date;
  updatedAt: Date;
};

const FxRateSchema = new mongoose.Schema<FxRate>(
  {
    fromCurrency: { type: String, required: true },
    toCurrency: { type: String, required: true },
    rate: { type: Number, required: true }
  },
  { _id: false }
);

const FxRateMonthSchema = new mongoose.Schema<FxRateMonthDoc>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    rates: { type: [FxRateSchema], default: [] }
  },
  { timestamps: true }
);

FxRateMonthSchema.index({ workspaceId: 1, year: 1, month: 1 }, { unique: true });

export const FxRateMonthModel = getModel<FxRateMonthDoc>("FxRateMonth", FxRateMonthSchema);
