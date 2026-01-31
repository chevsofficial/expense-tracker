import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { parseMonth } from "@/src/server/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

type TotalsRow = {
  _id: { currency: string; kind: "expense" | "income" };
  total: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const monthParam = request.nextUrl.searchParams.get("month");
  const parsedMonth = monthParam ? monthSchema.safeParse(monthParam) : null;
  if (!parsedMonth?.success) {
    return errorResponse("Invalid month", 400);
  }

  const month = parseMonth(parsedMonth.data);
  if (!month) {
    return errorResponse("Invalid month", 400);
  }

  const match = {
    workspaceId: auth.workspace._id,
    date: { $gte: month.start, $lt: month.end },
    isArchived: false,
    isPending: false,
  };

  const totals = await TransactionModel.aggregate<TotalsRow>([
    { $match: match },
    { $group: { _id: { currency: "$currency", kind: "$kind" }, total: { $sum: "$amountMinor" } } },
  ]);

  const totalsMap = new Map<string, { spendMinor: number; incomeMinor: number }>();
  totals.forEach((row) => {
    const entry = totalsMap.get(row._id.currency) ?? { spendMinor: 0, incomeMinor: 0 };
    if (row._id.kind === "expense") entry.spendMinor = row.total;
    if (row._id.kind === "income") entry.incomeMinor = row.total;
    totalsMap.set(row._id.currency, entry);
  });

  const totalsByCurrency = Array.from(totalsMap.entries()).map(([currency, totalsRow]) => ({
    currency,
    spendMinor: totalsRow.spendMinor,
    incomeMinor: totalsRow.incomeMinor,
    netMinor: totalsRow.incomeMinor - totalsRow.spendMinor,
  }));

  const spendByCurrency = totalsByCurrency.map((row) => ({
    currency: row.currency,
    totalMinor: row.spendMinor,
  }));

  const topCategories = await TransactionModel.aggregate<{
    _id: { categoryId: string; currency: string };
    total: number;
  }>([
    {
      $match: {
        ...match,
        kind: "expense",
        categoryId: { $ne: null },
      },
    },
    { $group: { _id: { categoryId: "$categoryId", currency: "$currency" }, total: { $sum: "$amountMinor" } } },
    { $sort: { total: -1 } },
    { $limit: 5 },
  ]);

  const categoryIds = topCategories.map((row) => row._id.categoryId);
  const categories = await CategoryModel.find({
    _id: { $in: categoryIds },
    workspaceId: auth.workspace.id,
  }).select("_id nameKey nameCustom");
  const categoryMap = new Map(
    categories.map((category) => [category._id.toString(), category])
  );

  const topMerchants = await TransactionModel.aggregate<{
    _id: { merchantId: string; currency: string };
    total: number;
  }>([
    {
      $match: {
        ...match,
        kind: "expense",
        merchantId: { $ne: null },
      },
    },
    { $group: { _id: { merchantId: "$merchantId", currency: "$currency" }, total: { $sum: "$amountMinor" } } },
    { $sort: { total: -1 } },
    { $limit: 5 },
  ]);

  const merchantIds = topMerchants.map((row) => row._id.merchantId);
  const merchants = await MerchantModel.find({
    _id: { $in: merchantIds },
    workspaceId: auth.workspace.id,
  }).select("_id name");
  const merchantMap = new Map(merchants.map((merchant) => [merchant._id.toString(), merchant.name]));

  return NextResponse.json({
    data: {
      month: parsedMonth.data,
      totalsByCurrency,
      spendByCurrency,
      topCategories: topCategories.map((row) => ({
        categoryId: row._id.categoryId,
        currency: row._id.currency,
        totalMinor: row.total,
        nameKey: categoryMap.get(row._id.categoryId)?.nameKey ?? null,
        nameCustom: categoryMap.get(row._id.categoryId)?.nameCustom ?? null,
      })),
      topMerchants: topMerchants.map((row) => ({
        merchantId: row._id.merchantId,
        currency: row._id.currency,
        totalMinor: row.total,
        name: merchantMap.get(row._id.merchantId) ?? "Unknown",
      })),
    },
  });
}
