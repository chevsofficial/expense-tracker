import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { buildTxFilter } from "@/src/server/dashboard/buildTxFilter";
import { isYmd, ymdToUtcDate } from "@/src/utils/dateOnly";

const querySchema = z
  .object({
    startDate: z.string().refine(isYmd, "Invalid start date").optional(),
    endDate: z.string().refine(isYmd, "Invalid end date").optional(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    merchantId: z.string().optional(),
    tagIds: z.array(z.string()).optional(),
  })
  .refine(
    (value) =>
      !(
        value.startDate &&
        value.endDate &&
        ymdToUtcDate(value.startDate) > ymdToUtcDate(value.endDate)
      ),
    { message: "Invalid date range" }
  );

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

const summarizeBalance = (
  rows: Array<{ _id: { kind: "income" | "expense" | "transfer"; transferSide?: "out" | "in" | null }; total: number }>
) => {
  let balanceMinor = 0;

  rows.forEach((row) => {
    if (row._id.kind === "income") {
      balanceMinor += row.total;
      return;
    }

    if (row._id.kind === "expense") {
      balanceMinor -= row.total;
      return;
    }

    balanceMinor += row._id.transferSide === "out" ? -row.total : row.total;
  });

  return { balanceMinor };
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    accountId: params.get("accountId") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    merchantId: params.get("merchantId") ?? undefined,
    tagIds: params.getAll("tagIds"),
  });
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const startDate = parsed.data.startDate ? ymdToUtcDate(parsed.data.startDate) : undefined;
  const endExclusive = parsed.data.endDate
    ? addDays(ymdToUtcDate(parsed.data.endDate), 1)
    : undefined;

  const accountId = parseOptionalId(parsed.data.accountId);
  const categoryId = parseOptionalId(parsed.data.categoryId);
  const merchantId = parseOptionalId(parsed.data.merchantId);
  const tagIds = (parsed.data.tagIds ?? []).map(parseOptionalId).filter((value): value is string => Boolean(value));

  const rangeFilter = buildTxFilter({
    workspaceId: auth.workspace.id,
    accountIds: accountId ? [accountId] : undefined,
    categoryIds: categoryId ? [categoryId] : undefined,
    merchantIds: merchantId ? [merchantId] : undefined,
    tagIds: tagIds.length ? tagIds : undefined,
    start: startDate,
    end: endExclusive,
  });

  const totalsRows = await TransactionModel.aggregate<{
    _id: { kind: "income" | "expense" };
    total: number;
  }>([
    { $match: { ...rangeFilter, kind: { $in: ["income", "expense"] } } },
    {
      $group: {
        _id: { kind: "$kind" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const totals = summarizeTotals(totalsRows);

  const balanceRows = await TransactionModel.aggregate<{
    _id: { kind: "income" | "expense" | "transfer"; transferSide?: "out" | "in" | null };
    total: number;
  }>([
    {
      $match: buildTxFilter({
        workspaceId: auth.workspace.id,
        accountIds: accountId ? [accountId] : undefined,
        categoryIds: categoryId ? [categoryId] : undefined,
        merchantIds: merchantId ? [merchantId] : undefined,
        tagIds: tagIds.length ? tagIds : undefined,
        end: endExclusive,
      }),
    },
    {
      $group: {
        _id: { kind: "$kind", transferSide: "$transferSide" },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);

  const balanceTotals = summarizeBalance(balanceRows);

  const startBalanceRows = startDate
    ? await TransactionModel.aggregate<{
        _id: { kind: "income" | "expense" | "transfer"; transferSide?: "out" | "in" | null };
        total: number;
      }>([
        {
          $match: buildTxFilter({
            workspaceId: auth.workspace.id,
            accountIds: accountId ? [accountId] : undefined,
            categoryIds: categoryId ? [categoryId] : undefined,
            merchantIds: merchantId ? [merchantId] : undefined,
            tagIds: tagIds.length ? tagIds : undefined,
            end: startDate,
          }),
        },
        {
          $group: {
            _id: { kind: "$kind", transferSide: "$transferSide" },
            total: { $sum: "$amountMinor" },
          },
        },
      ])
    : [];

  const startBalanceTotals = summarizeBalance(startBalanceRows);
  const totalChangeMinor = startDate
    ? balanceTotals.balanceMinor - startBalanceTotals.balanceMinor
    : balanceTotals.balanceMinor;

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


  const topTagsByKind = async (kind: "income" | "expense") => {
    const rows = await TransactionModel.aggregate<{
      _id: string;
      totalMinor: number;
      count: number;
      name?: string;
      color?: string | null;
    }>([
      { $match: { ...rangeFilter, kind, tagIds: { $exists: true, $ne: [] } } },
      { $unwind: "$tagIds" },
      {
        $group: {
          _id: "$tagIds",
          totalMinor: { $sum: "$amountMinor" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalMinor: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "tags",
          localField: "_id",
          foreignField: "_id",
          as: "tag",
        },
      },
      { $addFields: { tag: { $first: "$tag" } } },
      { $project: { totalMinor: 1, count: 1, name: "$tag.name", color: "$tag.color" } },
    ]);

    return rows.map((row) => ({
      tagId: row._id.toString(),
      name: row.name ?? "Unknown tag",
      color: row.color ?? null,
      totalMinor: row.totalMinor,
      count: row.count,
    }));
  };

  const [
    topCategoriesIncome,
    topCategoriesExpense,
    topMerchantsIncome,
    topMerchantsExpense,
    topGroupsIncome,
    topGroupsExpense,
    topTagsIncome,
    topTagsExpense,
  ] = await Promise.all([
    topCategoriesByKind("income"),
    topCategoriesByKind("expense"),
    topMerchantsByKind("income"),
    topMerchantsByKind("expense"),
    topGroupsByKind("income"),
    topGroupsByKind("expense"),
    topTagsByKind("income"),
    topTagsByKind("expense"),
  ]);

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
      tagSummaries: {
        income: topTagsIncome,
        expense: topTagsExpense,
      },
    },
  });
}
