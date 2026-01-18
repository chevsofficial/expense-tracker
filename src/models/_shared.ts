import mongoose, { type Model } from "mongoose";

export function getModel<T>(name: string, schema: mongoose.Schema<T>) {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}
