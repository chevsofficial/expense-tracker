import mongoose from "mongoose";
import { getModel } from "./_shared";

export type UserPlan = "free" | "pro";

export type UserDoc = {
  email: string;
  name?: string;
  plan: UserPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new mongoose.Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    plan: { type: String, enum: ["free", "pro"], default: "free", required: true },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String }
  },
  { timestamps: true }
);

export const UserModel = getModel<UserDoc>("User", UserSchema);
