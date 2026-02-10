import { NextResponse, type NextRequest } from "next/server";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { toYmdUtc } from "@/src/utils/dateOnly";

const addDays = (ymd: string, days: number) => {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  return toYmdUtc(next);
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  if (request.nextUrl.searchParams.has("currency")) {
    return errorResponse("Currency filtering is no longer supported.", 400);
  }

  const from = toYmdUtc(new Date());
  const to = addDays(from, 14);

  const recurringItems = await RecurringModel.find({
    workspaceId: auth.workspace.id,
    isArchived: false,
    nextRunOn: { $gte: from, $lte: to },
  }).lean();

  const categoryIds = recurringItems
    .map((item) => item.categoryId?.toString())
    .filter((id): id is string => Boolean(id));
  const merchantIds = recurringItems
    .map((item) => item.merchantId?.toString())
    .filter((id): id is string => Boolean(id));

  const [categories, merchants] = await Promise.all([
    CategoryModel.find({ _id: { $in: categoryIds }, workspaceId: auth.workspace.id }).select(
      "_id nameKey nameCustom emoji"
    ),
    MerchantModel.find({ _id: { $in: merchantIds }, workspaceId: auth.workspace.id }).select(
      "_id name"
    ),
  ]);

  const categoryMap = new Map(categories.map((category) => [category._id.toString(), category]));
  const merchantMap = new Map(merchants.map((merchant) => [merchant._id.toString(), merchant]));

  const items = recurringItems.map((item) => {
    const category = item.categoryId ? categoryMap.get(item.categoryId.toString()) : null;
    const merchant = item.merchantId ? merchantMap.get(item.merchantId.toString()) : null;

    return {
      recurringId: item._id.toString(),
      title: item.name,
      nextDate: item.nextRunOn,
      amountMinor: item.amountMinor,
      kind: item.kind,
      merchantName: merchant?.name ?? null,
      categoryName: category?.nameCustom?.trim() || category?.nameKey || null,
      categoryEmoji: category?.emoji ?? null,
    };
  });

  return NextResponse.json({
    data: {
      from,
      to,
      items,
    },
  });
}
