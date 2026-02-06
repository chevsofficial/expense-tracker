import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { toYmdUtc } from "@/src/utils/dateOnly";

const querySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

const addDays = (ymd: string, days: number) => {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  return toYmdUtc(next);
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const from = toYmdUtc(new Date());
  const to = addDays(from, 14);

  const recurringItems = await RecurringModel.find({
    workspaceId: auth.workspace.id,
    isArchived: false,
    ...(parsed.data.currency ? { currency: parsed.data.currency } : {}),
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
      currency: item.currency,
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
