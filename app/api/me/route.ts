import { NextResponse } from "next/server";
import { clientPromise } from "@/src/db/mongodbClient";
import { requireAuthContext } from "@/src/server/api";
import { AccountModel } from "@/src/models/Account";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { DashboardConfigModel } from "@/src/models/DashboardConfig";
import { FxRateMonthModel } from "@/src/models/FxRateMonth";
import { MerchantModel } from "@/src/models/Merchant";
import { TagModel } from "@/src/models/Tag";
import { TransactionModel } from "@/src/models/Transaction";
import { WorkspaceModel } from "@/src/models/Workspace";
import { UserModel } from "@/src/models/User";

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    data: {
      email: auth.user.email,
      firstName: "",
      lastName: "",
      dob: "",
      sex: "",
    },
  });
}

export async function DELETE() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const workspaceIds = await WorkspaceModel.find({ userId: auth.user._id }).distinct("_id");

  if (workspaceIds.length > 0) {
    await Promise.all([
      TransactionModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      AccountModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      CategoryModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      CategoryGroupModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      DashboardConfigModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      FxRateMonthModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      MerchantModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      TagModel.deleteMany({ workspaceId: { $in: workspaceIds } }),
      WorkspaceModel.deleteMany({ _id: { $in: workspaceIds } }),
    ]);
  }

  await UserModel.deleteOne({ _id: auth.user._id });

  const client = await clientPromise;
  const db = client.db();
  await Promise.all([
    db.collection("sessions").deleteMany({ userId: auth.user._id }),
    db.collection("accounts").deleteMany({ userId: auth.user._id }),
    db.collection("users").deleteOne({ _id: auth.user._id }),
  ]);

  return NextResponse.json({ data: { success: true } });
}
