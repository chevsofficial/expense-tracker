import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
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
});

const addDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

const parseOptionalId = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const summarizeTotals = (rows: Array<{ _id: { kind: "income" | "expense" }; total: number }>) => {
  let incomeMinor = 0;
  let expenseMinor = 0;

  rows.forEach((row) => {
    if (row._id.kind === "income") {
      incomeMinor = row.total;
    } else {
      expenseMinor = row.total;
    }
  });

  return {
    incomeMinor,
    expenseMinor,
    balanceMinor: incomeMinor - expenseMinor,
  };
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
    start: startDate,
    end: endExclusive,
  });

  const totalsRows = await TransactionModel.aggregate<{
    _id: { kind: "income" | "expense" };
    total: number;
  }>([
    { $match: rangeFilter },
    {
      $group: {
        _id: { kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const totals = summarizeTotals(totalsRows);

  const balanceRows = await TransactionModel.aggregate<{
    _id: { kind: "income" | "expense" };
    total: number;
  }>([
    {
      $match: buildTxFilter({
        workspaceId: auth.workspace.id,
        accountIds: accountId ? [accountId] : undefined,
        categoryIds: categoryId ? [categoryId] : undefined,
        merchantIds: merchantId ? [merchantId] : undefined,
        end: endExclusive,
      }),
    },
    {
      $group: {
        _id: { kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const balanceTotals = summarizeTotals(balanceRows);

  const startBalanceRows = await TransactionModel.aggregate<{
    _id: { kind: "income" | "expense" };
    total: number;
  }>([
    {
      $match: buildTxFilter({
        workspaceId: auth.workspace.id,
        accountIds: accountId ? [accountId] : undefined,
        categoryIds: categoryId ? [categoryId] : undefined,
        merchantIds: merchantId ? [merchantId] : undefined,
        end: startDate,
      }),
    },
    {
      $group: {
        _id: { kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const startBalanceTotals = summarizeTotals(startBalanceRows);
  const totalChangeMinor = balanceTotals.balanceMinor - startBalanceTotals.balanceMinor;

  const topCategoriesByKind = async (kind: "income" | "expense") => {
    const rows = await TransactionModel.aggregate<{
      _id: { categoryId: string | null };
      total: number;
      count: number;
      workspaceId: string;
      category?: { nameKey?: string; nameCustom?: string; emoji?: string | null };
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $group: {
          _id: { categoryId: "$categoryId" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
          workspaceId: { $first: "$workspaceId" },
        },
      },
      { $sort: { total: -1 } },
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
        amountMinor: row.total,
        count: row.count,
      };
    });
  };

  const topMerchantsByKind = async (kind: "income" | "expense") => {
    const rows = await TransactionModel.aggregate<{
      _id: { merchantId: string | null };
      total: number;
      count: number;
      workspaceId: string;
      merchant?: { name?: string };
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $group: {
          _id: { merchantId: "$merchantId" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
          workspaceId: { $first: "$workspaceId" },
        },
      },
      { $sort: { total: -1 } },
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
        amountMinor: row.total,
        count: row.count,
      };
    });
  };

  const topGroupsByKind = async (kind: "income" | "expense") => {
    const rows = await TransactionModel.aggregate<{
      _id: { groupId: string | null };
      total: number;
      count: number;
      workspaceId: string;
      group?: { nameKey?: string; nameCustom?: string };
    }>([
      { $match: { ...rangeFilter, kind } },
      {
        $lookup: {
          from: "categories",
          let: { cid: "$categoryId", wid: "$workspaceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$cid"] }, { $eq: ["$workspaceId", "$$wid"] }],
                },
              },
            },
            { $project: { groupId: 1 } },
          ],
          as: "category",
        },
      },
      { $addFields: { category: { $first: "$category" } } },
      { $addFields: { groupId: { $ifNull: ["$category.groupId", null] } } },
      {
        $group: {
          _id: { groupId: "$groupId" },
          total: { $sum: "$amountMinor" },
          count: { $sum: 1 },
          workspaceId: { $first: "$workspaceId" },
        },
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: "categorygroups",
          let: { gid: "$_id.groupId", wid: "$workspaceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$_id", "$$gid"] }, { $eq: ["$workspaceId", "$$wid"] }],
                },
              },
            },
            { $project: { nameKey: 1, nameCustom: 1 } },
          ],
          as: "group",
        },
      },
      { $addFields: { group: { $first: "$group" } } },
    ]);

    return rows.map((row) => {
      const hasGroup = Boolean(row._id.groupId);
      const groupName = hasGroup
        ? row.group?.nameCustom?.trim() || row.group?.nameKey || "Unknown group"
        : "Uncategorized";
      return {
        groupId: row._id.groupId ? row._id.groupId.toString() : null,
        groupName,
        amountMinor: row.total,
        count: row.count,
      };
    });
  };

  const [
    topCategoriesIncome,
    topCategoriesExpense,
    topMerchantsIncome,
    topMerchantsExpense,
    topGroupsIncome,
    topGroupsExpense,
  ] = await Promise.all([
    topCategoriesByKind("income"),
    topCategoriesByKind("expense"),
    topMerchantsByKind("income"),
    topMerchantsByKind("expense"),
    topGroupsByKind("income"),
    topGroupsByKind("expense"),
  ]);

  const budgetSummary = await getBudgetSummary({
    workspace: auth.workspace,
    month: currentMonth(),
  });
  const budgetTotals = budgetSummary.totals ?? {
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
        amountMinor: balanceTotals.balanceMinor,
      },
      totalChange: {
        amountMinor: totalChangeMinor,
      },
      byCategory: {
        income: topCategoriesIncome,
        expense: topCategoriesExpense,
      },
      byMerchant: {
        income: topMerchantsIncome,
        expense: topMerchantsExpense,
      },
      byGroup: {
        income: topGroupsIncome,
        expense: topGroupsExpense,
      },
      budgetVsActual: {
        plannedMinor: budgetTotals.plannedMinor,
        actualMinor: budgetTotals.actualMinor,
        remainingMinor: budgetTotals.remainingMinor,
        progressPct: budgetProgress,
      },
    },
  });
}
