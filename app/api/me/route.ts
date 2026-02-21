import { NextResponse } from "next/server";
import { z } from "zod";
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

const profileUpdateSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  dateOfBirth: z.union([z.literal(""), z.string().date()]).optional(),
  sex: z.enum(["", "female", "male", "nonbinary", "prefer_not_to_say"]).optional(),
  locale: z.enum(["en", "es"]).optional(),
  themePreference: z.enum(["system", "light", "dark"]).optional(),
});

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    data: {
      email: auth.user.email,
      firstName: auth.user.firstName ?? "",
      lastName: auth.user.lastName ?? "",
      dateOfBirth: auth.user.dateOfBirth ?? "",
      sex: auth.user.sex ?? "",
      locale: auth.user.locale ?? "en",
      themePreference: auth.user.themePreference ?? "system",
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: parsed.error.message } }, { status: 400 });
  }

  const {
    firstName,
    lastName,
    dateOfBirth,
    sex,
    locale,
    themePreference,
  } = parsed.data;

  if (firstName !== undefined) auth.user.firstName = firstName;
  if (lastName !== undefined) auth.user.lastName = lastName;
  if (dateOfBirth !== undefined) auth.user.dateOfBirth = dateOfBirth;
  if (sex !== undefined) auth.user.sex = sex;
  if (locale !== undefined) auth.user.locale = locale;
  if (themePreference !== undefined) auth.user.themePreference = themePreference;
  await auth.user.save();

  return NextResponse.json({
    data: {
      email: auth.user.email,
      firstName: auth.user.firstName ?? "",
      lastName: auth.user.lastName ?? "",
      dateOfBirth: auth.user.dateOfBirth ?? "",
      sex: auth.user.sex ?? "",
      locale: auth.user.locale ?? "en",
      themePreference: auth.user.themePreference ?? "system",
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
