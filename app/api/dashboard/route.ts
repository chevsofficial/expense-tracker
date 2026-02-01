import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { currentMonth } from "@/src/server/month";
import { monthRange } from "@/src/utils/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

type TotalsRow = {
  _id: { currency: string; kind: "expense" | "income" };
  total: number;
  count: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const monthParam = params.get("month") ?? currentMonth();
  const parsedMonth = monthSchema.safeParse(monthParam);
  if (!parsedMonth.success) {
    return errorResponse("Invalid month", 400);
  }

  const includePending = params.get("includePending") !== "false";
  const includeArchived = params.get("includeArchived") === "true";
  const range = monthRange(parsedMonth.data);
  const start = new Date(`${range.start}T00:00:00.000Z`);
  const end = new Date(`${range.end}T00:00:00.000Z`);

  const match: Record<string, unknown> = {
    workspaceId: auth.workspace._id,
    date: { $gte: start, $lt: end },
    ...(includeArchived ? {} : { isArchived: false }),
    ...(includePending ? {} : { isPending: false }),
  };

  const totals = await TransactionModel.aggregate<TotalsRow>([
    { $match: match },
    {
      $group: {
        _id: { currency: "$currency", kind: "$kind" },
        total: { $sum: "$amountMinor" },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalsMap = new Map<string, { expenseMinor: number; incomeMinor: number; count: number }>();
  totals.forEach((row) => {
    const entry = totalsMap.get(row._id.currency) ?? {
      expenseMinor: 0,
      incomeMinor: 0,
      count: 0,
    };
    if (row._id.kind === "expense") entry.expenseMinor = row.total;
    if (row._id.kind === "income") entry.incomeMinor = row.total;
    entry.count += row.count;
    totalsMap.set(row._id.currency, entry);
  });

  const totalsByCurrency = Array.from(totalsMap.entries()).map(([currency, totalsRow]) => ({
    currency,
    incomeMinor: totalsRow.incomeMinor,
    expenseMinor: totalsRow.expenseMinor,
    netMinor: totalsRow.incomeMinor - totalsRow.expenseMinor,
    transactionCount: totalsRow.count,
  }));

  const topCategories = await TransactionModel.aggregate<{
    _id: { categoryId: string | null; currency: string };
    expenseMinor: number;
    count: number;
  }>([
    {
      $match: {
        ...match,
        kind: "expense",
      },
    },
    {
      $group: {
        _id: { categoryId: "$categoryId", currency: "$currency" },
        expenseMinor: { $sum: "$amountMinor" },
        count: { $sum: 1 },
      },
    },
    { $sort: { expenseMinor: -1 } },
    { $limit: 5 },
  ]);

  const categoryIds = topCategories
    .map((row) => row._id.categoryId)
    .filter((id): id is string => Boolean(id));
  const categories = await CategoryModel.find({
    _id: { $in: categoryIds },
    workspaceId: auth.workspace.id,
  }).select("_id nameKey nameCustom");
  const categoryMap = new Map(categories.map((category) => [category._id.toString(), category]));

  const topMerchants = await TransactionModel.aggregate<{
    _id: { merchantId: string | null; currency: string };
    expenseMinor: number;
    count: number;
    merchantNameSnapshot?: string | null;
  }>([
    {
      $match: {
        ...match,
        kind: "expense",
      },
    },
    {
      $group: {
        _id: { merchantId: "$merchantId", currency: "$currency" },
        expenseMinor: { $sum: "$amountMinor" },
        count: { $sum: 1 },
        merchantNameSnapshot: { $first: "$merchantNameSnapshot" },
      },
    },
    { $sort: { expenseMinor: -1 } },
    { $limit: 5 },
  ]);

  const merchantIds = topMerchants
    .map((row) => row._id.merchantId)
    .filter((id): id is string => Boolean(id));
  const merchants = await MerchantModel.find({
    _id: { $in: merchantIds },
    workspaceId: auth.workspace.id,
  }).select("_id name");
  const merchantMap = new Map(merchants.map((merchant) => [merchant._id.toString(), merchant.name]));

  return NextResponse.json({
    data: {
      month: parsedMonth.data,
      totalsByCurrency,
      topMerchants: topMerchants.map((row) => {
        const merchantId = row._id.merchantId;
        const resolvedName = merchantId
          ? merchantMap.get(merchantId) ?? row.merchantNameSnapshot ?? "Unassigned"
          : row.merchantNameSnapshot ?? "Unassigned";
        return {
          merchantId,
          merchantName: resolvedName,
          currency: row._id.currency,
          expenseMinor: row.expenseMinor,
          count: row.count,
        };
      }),
      topCategories: topCategories.map((row) => {
        const categoryId = row._id.categoryId;
        const category = categoryId ? categoryMap.get(categoryId) : null;
        const resolvedName =
          category?.nameCustom?.trim() || category?.nameKey || "Uncategorized";
        return {
          categoryId,
          categoryName: categoryId ? resolvedName : "Uncategorized",
          currency: row._id.currency,
          expenseMinor: row.expenseMinor,
          count: row.count,
        };
      }),
    },
  });
}
