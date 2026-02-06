import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { buildTxFilter } from "@/src/server/dashboard/buildTxFilter";
import { getBudgetSummary } from "@/src/server/budget/getBudgetSummary";
import { currentMonth } from "@/src/server/month";
import { isYmd, ymdToUtcDate } from "@/src/utils/dateOnly";

const querySchema = z.object({
  start: z.string().refine(isYmd, "Invalid start date"),
  end: z.string().refine(isYmd, "Invalid end date"),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  merchantId: z.string().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

const addDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const parseOptionalId = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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

  const accountId = parseOptionalId(parsed.data.accountId);
  const categoryId = parseOptionalId(parsed.data.categoryId);
  const merchantId = parseOptionalId(parsed.data.merchantId);

  const rangeFilter = buildTxFilter({
    workspaceId: auth.workspace.id,
    accountIds: accountId ? [accountId] : undefined,
    categoryIds: categoryId ? [categoryId] : undefined,
    merchantIds: merchantId ? [merchantId] : undefined,
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
        accountIds: accountId ? [accountId] : undefined,
        categoryIds: categoryId ? [categoryId] : undefined,
        merchantIds: merchantId ? [merchantId] : undefined,
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
        accountIds: accountId ? [accountId] : undefined,
        categoryIds: categoryId ? [categoryId] : undefined,
        merchantIds: merchantId ? [merchantId] : undefined,
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
      workspaceId: string;
      category?: { nameKey?: string; nameCustom?: string; emoji?: string | null };
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $group: {
          _id: { categoryId: "$categoryId", currency: "$currency" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
          workspaceId: { $first: "$workspaceId" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          let: { cid: "$_id.categoryId", wid: "$workspaceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$cid"] }, { $eq: ["$workspaceId", "$$wid"] }],
                },
              },
            },
            { $project: { nameKey: 1, nameCustom: 1, emoji: 1 } },
          ],
          as: "category",
        },
      },
      { $addFields: { category: { $first: "$category" } } },
    ]);

    return rows.map((row) => {
      const hasCategory = Boolean(row._id.categoryId);
      const categoryName = hasCategory
        ? row.category?.nameCustom?.trim() || row.category?.nameKey || "Unknown category"
        : "Uncategorized";
      return {
        id: row._id.categoryId ? row._id.categoryId.toString() : null,
        name: categoryName,
        emoji: row.category?.emoji ?? null,
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
      workspaceId: string;
      merchant?: { name?: string };
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $group: {
          _id: { merchantId: "$merchantId", currency: "$currency" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
          workspaceId: { $first: "$workspaceId" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "merchants",
          let: { mid: "$_id.merchantId", wid: "$workspaceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$mid"] }, { $eq: ["$workspaceId", "$$wid"] }],
                },
              },
            },
            { $project: { name: 1 } },
          ],
          as: "merchant",
        },
      },
      { $addFields: { merchant: { $first: "$merchant" } } },
    ]);

    return rows.map((row) => {
      const hasMerchant = Boolean(row._id.merchantId);
      const merchantName = hasMerchant ? row.merchant?.name || "Unknown merchant" : "Unassigned";
      return {
        id: row._id.merchantId ? row._id.merchantId.toString() : null,
        name: merchantName,
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
      accountIds: accountId ? [accountId] : undefined,
      categoryIds: categoryId ? [categoryId] : undefined,
      merchantIds: merchantId ? [merchantId] : undefined,
    })
  );

  const budgetSummary = await getBudgetSummary({
    workspace: auth.workspace,
    month: currentMonth(),
  });
  const budgetSection =
    budgetSummary.currencies.find((section) => section.currency === budgetSummary.budgetCurrency) ??
    budgetSummary.currencies[0];
  const budgetTotals = budgetSection?.totals ?? {
    plannedMinor: 0,
    actualMinor: 0,
    remainingMinor: 0,
  };
  const budgetProgress =
    budgetTotals.plannedMinor > 0
      ? Math.min(budgetTotals.actualMinor / budgetTotals.plannedMinor, 1)
      : 0;

  return NextResponse.json({
    data: {
      totals,
      totalBalanceAsOfEnd: {
        byCurrency: balanceTotals.balanceMinorByCurrency,
      },
      totalChange: {
        byCurrency: totalChangeByCurrency,
      },
      byCategory: {
        income: topCategoriesIncome,
        expense: topCategoriesExpense,
      },
      byMerchant: {
        income: topMerchantsIncome,
        expense: topMerchantsExpense,
      },
      budgetVsActual: {
        plannedMinor: budgetTotals.plannedMinor,
        actualMinor: budgetTotals.actualMinor,
        remainingMinor: budgetTotals.remainingMinor,
        progressPct: budgetProgress,
        currency: budgetSection?.currency ?? budgetSummary.budgetCurrency,
      },
      supportedCurrencies,
    },
  });
}
