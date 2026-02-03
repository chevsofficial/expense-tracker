import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { MerchantModel } from "@/src/models/Merchant";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { currentMonth } from "@/src/server/month";
import { monthRange } from "@/src/utils/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

type TotalsRow = {
  _id: { currency: string; kind: "expense" | "income" };
  total: number;
  count: number;
};

type BreakdownRow = {
  _id: { currency: string; kind: "expense" | "income"; refId: string | null };
  total: number;
  count: number;
};

type MerchantRow = {
  _id: { currency: string; kind: "expense" | "income"; merchantId: string | null };
  total: number;
  count: number;
  merchantNameSnapshot?: string | null;
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

  const range = monthRange(parsedMonth.data);
  const start = new Date(`${range.start}T00:00:00.000Z`);
  const end = new Date(`${range.end}T00:00:00.000Z`);

  const match: Record<string, unknown> = {
    workspaceId: auth.workspace._id,
    date: { $gte: start, $lt: end },
    isArchived: false,
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

  const totalsByCurrency: Record<
    string,
    {
      incomeMinor: number;
      expenseMinor: number;
      netMinor: number;
      incomeCount: number;
      expenseCount: number;
    }
  > = {};

  totals.forEach((row) => {
    const entry = totalsByCurrency[row._id.currency] ?? {
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      incomeCount: 0,
      expenseCount: 0,
    };

    if (row._id.kind === "income") {
      entry.incomeMinor = row.total;
      entry.incomeCount = row.count;
    } else {
      entry.expenseMinor = row.total;
      entry.expenseCount = row.count;
    }

    entry.netMinor = entry.incomeMinor - entry.expenseMinor;
    totalsByCurrency[row._id.currency] = entry;
  });

  const categoryRows = await TransactionModel.aggregate<BreakdownRow>([
    { $match: match },
    {
      $group: {
        _id: { currency: "$currency", kind: "$kind", refId: "$categoryId" },
        total: { $sum: "$amountMinor" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const categoryIds = categoryRows
    .map((row) => row._id.refId)
    .filter((id): id is string => Boolean(id));
  const categories = await CategoryModel.find({
    _id: { $in: categoryIds },
    workspaceId: auth.workspace._id,
  }).select("_id nameKey nameCustom groupId");
  const categoryMap = new Map(
    categories.map((category) => [category._id.toString(), category])
  );

  const groupIds = categories
    .map((category) => category.groupId?.toString())
    .filter((id): id is string => Boolean(id));
  const groups = await CategoryGroupModel.find({
    _id: { $in: groupIds },
    workspaceId: auth.workspace._id,
  }).select("_id nameKey nameCustom");
  const groupMap = new Map(groups.map((group) => [group._id.toString(), group]));

  const byCategory = {
    income: [] as Array<{
      categoryId: string | null;
      categoryName: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>,
    expense: [] as Array<{
      categoryId: string | null;
      categoryName: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>,
  };

  const byGroup = {
    income: [] as Array<{
      groupId: string | null;
      groupName: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>,
    expense: [] as Array<{
      groupId: string | null;
      groupName: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>,
  };

  const groupBuckets = {
    income: new Map<string, { groupId: string | null; groupName: string; currency: string; amountMinor: number; count: number }>(),
    expense: new Map<string, { groupId: string | null; groupName: string; currency: string; amountMinor: number; count: number }>(),
  };

  categoryRows.forEach((row) => {
    const categoryId = row._id.refId;
    const category = categoryId ? categoryMap.get(categoryId) : null;
    const categoryName =
      category?.nameCustom?.trim() || category?.nameKey || "Uncategorized";

    byCategory[row._id.kind].push({
      categoryId,
      categoryName: categoryId ? categoryName : "Uncategorized",
      currency: row._id.currency,
      amountMinor: row.total,
      count: row.count,
    });

    const groupId = category?.groupId?.toString() ?? null;
    const group = groupId ? groupMap.get(groupId) : null;
    const groupName = group?.nameCustom?.trim() || group?.nameKey || "Ungrouped";
    const key = `${groupId ?? "ungrouped"}-${row._id.currency}`;
    const bucketMap = groupBuckets[row._id.kind];
    const bucket = bucketMap.get(key) ?? {
      groupId,
      groupName,
      currency: row._id.currency,
      amountMinor: 0,
      count: 0,
    };

    bucket.amountMinor += row.total;
    bucket.count += row.count;
    bucketMap.set(key, bucket);
  });

  (Object.keys(groupBuckets) as Array<"income" | "expense">).forEach((kind) => {
    byGroup[kind] = Array.from(groupBuckets[kind].values());
  });

  const merchantRows = await TransactionModel.aggregate<MerchantRow>([
    { $match: match },
    {
      $group: {
        _id: { currency: "$currency", kind: "$kind", merchantId: "$merchantId" },
        total: { $sum: "$amountMinor" },
        count: { $sum: 1 },
        merchantNameSnapshot: { $first: "$merchantNameSnapshot" },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const merchantIds = merchantRows
    .map((row) => row._id.merchantId)
    .filter((id): id is string => Boolean(id));
  const merchants = await MerchantModel.find({
    _id: { $in: merchantIds },
    workspaceId: auth.workspace._id,
  }).select("_id name");
  const merchantMap = new Map(merchants.map((merchant) => [merchant._id.toString(), merchant.name]));

  const byMerchant = {
    income: [] as Array<{
      merchantId: string | null;
      merchantName: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>,
    expense: [] as Array<{
      merchantId: string | null;
      merchantName: string;
      currency: string;
      amountMinor: number;
      count: number;
    }>,
  };

  merchantRows.forEach((row) => {
    const merchantId = row._id.merchantId;
    const resolvedName = merchantId
      ? merchantMap.get(merchantId) ?? row.merchantNameSnapshot ?? "Unassigned"
      : row.merchantNameSnapshot ?? "Unassigned";

    byMerchant[row._id.kind].push({
      merchantId,
      merchantName: resolvedName,
      currency: row._id.currency,
      amountMinor: row.total,
      count: row.count,
    });
  });

  const budgetMonths = await BudgetMonthModel.find({
    workspaceId: auth.workspace._id,
    month: parsedMonth.data,
  }).select("currency plannedLines");

  const plannedByCurrency = new Map<string, number>();
  budgetMonths.forEach((budget) => {
    const planned = budget.plannedLines
      .filter((line) => (line.kind ?? "expense") === "expense")
      .reduce((sum, line) => sum + line.plannedAmountMinor, 0);
    plannedByCurrency.set(budget.currency, planned);
  });

  const actualRows = await TransactionModel.aggregate<{
    _id: { currency: string };
    total: number;
  }>([
    { $match: { ...match, kind: "expense" } },
    {
      $group: {
        _id: { currency: "$currency" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const actualByCurrency = new Map<string, number>();
  actualRows.forEach((row) => {
    actualByCurrency.set(row._id.currency, row.total);
  });

  const allCurrencies = new Set<string>([
    ...plannedByCurrency.keys(),
    ...actualByCurrency.keys(),
  ]);

  const budgetVsActual: Record<
    string,
    { plannedMinor: number; actualMinor: number; remainingMinor: number; progressPct: number }
  > = {};

  allCurrencies.forEach((currency) => {
    const plannedMinor = plannedByCurrency.get(currency) ?? 0;
    const actualMinor = actualByCurrency.get(currency) ?? 0;
    const remainingMinor = plannedMinor - actualMinor;
    const progressPct = plannedMinor > 0 ? actualMinor / plannedMinor : 0;
    budgetVsActual[currency] = {
      plannedMinor,
      actualMinor,
      remainingMinor,
      progressPct,
    };
  });

  return NextResponse.json({
    data: {
      month: parsedMonth.data,
      totalsByCurrency,
      byCategory,
      byGroup,
      byMerchant,
      budgetVsActual,
    },
  });
}

export const dynamic = "force-dynamic";
