import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { buildTxFilter } from "@/src/server/dashboard/buildTxFilter";
import { isYmd, ymdToUtcDate } from "@/src/utils/dateOnly";

const querySchema = z.object({
  start: z.string().refine(isYmd, "Invalid start date"),
  end: z.string().refine(isYmd, "Invalid end date"),
  accountIds: z.string().optional(),
  categoryIds: z.string().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

const addDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const parseIdList = (value?: string) => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const summarizeTotals = (rows: Array<{ _id: { currency: string; kind: "income" | "expense" }; total: number }>) => {
  const incomeMinorByCurrency: Record<string, number> = {};
  const expenseMinorByCurrency: Record<string, number> = {};
  const balanceMinorByCurrency: Record<string, number> = {};

  rows.forEach((row) => {
    if (row._id.kind === "income") {
      incomeMinorByCurrency[row._id.currency] = row.total;
    } else {
      expenseMinorByCurrency[row._id.currency] = row.total;
    }
  });

  const currencies = new Set([
    ...Object.keys(incomeMinorByCurrency),
    ...Object.keys(expenseMinorByCurrency),
  ]);
  currencies.forEach((currency) => {
    balanceMinorByCurrency[currency] =
      (incomeMinorByCurrency[currency] ?? 0) - (expenseMinorByCurrency[currency] ?? 0);
  });

  return { incomeMinorByCurrency, expenseMinorByCurrency, balanceMinorByCurrency };
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const startDate = ymdToUtcDate(parsed.data.start);
  const endDateInclusive = ymdToUtcDate(parsed.data.end);
  if (startDate > endDateInclusive) {
    return errorResponse("Invalid date range", 400);
  }
  const endExclusive = addDays(endDateInclusive, 1);

  const accountIds = parseIdList(parsed.data.accountIds);
  const categoryIds = parseIdList(parsed.data.categoryIds);

  const rangeFilter = buildTxFilter({
    workspaceId: auth.workspace.id,
    accountIds,
    categoryIds,
    currency: parsed.data.currency,
    start: startDate,
    end: endExclusive,
  });

  const totalsRows = await TransactionModel.aggregate<{
    _id: { currency: string; kind: "income" | "expense" };
    total: number;
  }>([
    { $match: rangeFilter },
    {
      $group: {
        _id: { currency: "$currency", kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const totals = summarizeTotals(totalsRows);

  const balanceRows = await TransactionModel.aggregate<{
    _id: { currency: string; kind: "income" | "expense" };
    total: number;
  }>([
    {
      $match: buildTxFilter({
        workspaceId: auth.workspace.id,
        accountIds,
        categoryIds,
        currency: parsed.data.currency,
        end: endExclusive,
      }),
    },
    {
      $group: {
        _id: { currency: "$currency", kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const balanceTotals = summarizeTotals(balanceRows);

  const startBalanceRows = await TransactionModel.aggregate<{
    _id: { currency: string; kind: "income" | "expense" };
    total: number;
  }>([
    {
      $match: buildTxFilter({
        workspaceId: auth.workspace.id,
        accountIds,
        categoryIds,
        currency: parsed.data.currency,
        end: startDate,
      }),
    },
    {
      $group: {
        _id: { currency: "$currency", kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const startBalanceTotals = summarizeTotals(startBalanceRows);

  const totalChangeByCurrency: Record<string, number> = {};
  const changeCurrencies = new Set([
    ...Object.keys(balanceTotals.balanceMinorByCurrency),
    ...Object.keys(startBalanceTotals.balanceMinorByCurrency),
  ]);
  changeCurrencies.forEach((currency) => {
    totalChangeByCurrency[currency] =
      (balanceTotals.balanceMinorByCurrency[currency] ?? 0) -
      (startBalanceTotals.balanceMinorByCurrency[currency] ?? 0);
  });

  const topCategoriesByKind = async (kind: "income" | "expense") => {
    const rows = await TransactionModel.aggregate<{
      _id: { categoryId: string | null; currency: string };
      total: number;
      count: number;
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $group: {
          _id: { categoryId: "$categoryId", currency: "$currency" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    const categoryIds = rows
      .map((row) => row._id.categoryId)
      .filter((id): id is string => Boolean(id));

    const categories = await CategoryModel.find({
      _id: { $in: categoryIds },
      workspaceId: auth.workspace.id,
    }).select("_id nameKey nameCustom emoji");

    const categoryMap = new Map(categories.map((category) => [category._id.toString(), category]));

    return rows.map((row) => {
      const category = row._id.categoryId ? categoryMap.get(row._id.categoryId) : null;
      const categoryName =
        category?.nameCustom?.trim() || category?.nameKey || "Uncategorized";
      return {
        categoryId: row._id.categoryId,
        categoryName,
        emoji: category?.emoji ?? null,
        currency: row._id.currency,
        amountMinor: row.total,
        count: row.count,
      };
    });
  };

  const topMerchantsByKind = async (kind: "income" | "expense") => {
    const rows = await TransactionModel.aggregate<{
      _id: { merchantId: string | null; currency: string };
      total: number;
      count: number;
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $group: {
          _id: { merchantId: "$merchantId", currency: "$currency" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]);

    const merchantIds = rows
      .map((row) => row._id.merchantId)
      .filter((id): id is string => Boolean(id));

    const merchants = await MerchantModel.find({
      _id: { $in: merchantIds },
      workspaceId: auth.workspace.id,
    }).select("_id name");

    const merchantMap = new Map(merchants.map((merchant) => [merchant._id.toString(), merchant]));

    return rows.map((row) => {
      const merchant = row._id.merchantId ? merchantMap.get(row._id.merchantId) : null;
      return {
        merchantId: row._id.merchantId,
        merchantName: merchant?.name ?? "Unassigned",
        currency: row._id.currency,
        amountMinor: row.total,
        count: row.count,
      };
    });
  };

  const [topCategoriesIncome, topCategoriesExpense, topMerchantsIncome, topMerchantsExpense] =
    await Promise.all([
      topCategoriesByKind("income"),
      topCategoriesByKind("expense"),
      topMerchantsByKind("income"),
      topMerchantsByKind("expense"),
    ]);

  const supportedCurrencies = await TransactionModel.distinct(
    "currency",
    buildTxFilter({
      workspaceId: auth.workspace.id,
      accountIds,
      categoryIds,
    })
  );

  return NextResponse.json({
    data: {
      totals,
      totalBalanceAsOfEnd: {
        byCurrency: balanceTotals.balanceMinorByCurrency,
      },
      totalChange: {
        byCurrency: totalChangeByCurrency,
      },
      topCategories: {
        income: topCategoriesIncome,
        expense: topCategoriesExpense,
      },
      topMerchants: {
        income: topMerchantsIncome,
        expense: topMerchantsExpense,
      },
      supportedCurrencies,
    },
  });
}
