import mongoose from "mongoose";
import { getModel } from "./_shared";

export type UserPlan = "free" | "pro";

export type UserDoc = {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sex?: "" | "female" | "male" | "nonbinary" | "prefer_not_to_say";
  locale?: "en" | "es";
  themePreference?: "system" | "light" | "dark";
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
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: String },
    sex: { type: String, enum: ["", "female", "male", "nonbinary", "prefer_not_to_say"], default: "" },
    locale: { type: String, enum: ["en", "es"], default: "en" },
    themePreference: { type: String, enum: ["system", "light", "dark"], default: "system" },
    plan: { type: String, enum: ["free", "pro"], default: "free", required: true },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String }
  },
  { timestamps: true }
);

export const UserModel = getModel<UserDoc>("User", UserSchema);
