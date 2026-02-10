import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { BudgetModel } from "@/src/models/Budget";
import { TransactionModel } from "@/src/models/Transaction";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { monthRange } from "@/src/utils/month";
import { currentMonth } from "@/src/server/month";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const dateSchema = z.string().refine((value) => isYmd(value), "Invalid date");

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

const createSchema = z.object({
  name: z.string().trim().min(1),
  emoji: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  type: z.enum(["monthly", "custom"]),
  startMonth: monthSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  categoryIds: z.array(z.string().min(1)).nullable().optional(),
  accountIds: z.array(z.string().min(1)).nullable().optional(),
  categoryBudgets: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        amount: z.number().nonnegative().refine(Number.isFinite),
      })
    )
    .default([]),
  pinned: z.boolean().optional(),
});

function toUtcDate(date: string) {
  return normalizeToUtcMidnight(date);
}

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function parseObjectIdArrayOrNull(
  values: string[] | null | undefined,
  label: string
): mongoose.Types.ObjectId[] | null | undefined {
  if (values === undefined) return undefined;
  if (values === null) return null;

  const cleaned = values.filter((value) => typeof value === "string" && value.trim().length > 0);
  return cleaned.map((id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ${label} id`);
    }
    return new mongoose.Types.ObjectId(id);
  });
}

function monthToRange(month: string) {
  const { start, end } = monthRange(month);
  return { start, end };
}

async function getBudgetSpend({
  workspaceId,
  categoryIds,
  accountIds,
  startDate,
  endDate,
}: {
  workspaceId: string;
  categoryIds: mongoose.Types.ObjectId[];
  accountIds: mongoose.Types.ObjectId[] | null;
  startDate: Date;
  endDate: Date;
}) {
  if (!categoryIds.length) return 0;
  const accountFilter = accountIds ? { accountId: { $in: accountIds } } : {};
  const result = await TransactionModel.aggregate<{ total: number }>([
    {
      $match: {
        workspaceId: parseObjectId(workspaceId),
        isArchived: false,
        kind: "expense",
        categoryId: { $in: categoryIds },
        ...accountFilter,
        date: { $gte: startDate, $lt: endDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$amountMinor" } } },
  ]);
  return result[0]?.total ?? 0;
}

function isMonthBefore(value: string, baseline: string) {
  return value < baseline;
}

function resolveMonthRangeForBudget(
  budget: { type: "monthly" | "custom"; startMonth?: string | null; startDate?: Date | null; endDate?: Date | null }
) {
  if (budget.type === "monthly") {
    const current = currentMonth();
    const resolvedMonth =
      budget.startMonth && isMonthBefore(current, budget.startMonth) ? budget.startMonth : current;
    return monthToRange(resolvedMonth);
  }
  const start = budget.startDate ? budget.startDate.toISOString().slice(0, 10) : null;
  let end = budget.endDate ? budget.endDate.toISOString().slice(0, 10) : null;
  if (budget.endDate) {
    const next = new Date(budget.endDate);
    next.setUTCDate(next.getUTCDate() + 1);
    end = next.toISOString().slice(0, 10);
  }
  return { start, end };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const includeArchived = params.get("includeArchived") === "true";
  const includeSummary = params.get("includeSummary") === "true";

  const budgets = await BudgetModel.find({
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { archivedAt: null }),
  })
    .lean();

  const sortedBudgets = (() => {
    const pinned = budgets
      .filter((budget) => budget.pinnedAt)
      .sort((a, b) => (a.pinnedAt?.getTime() ?? 0) - (b.pinnedAt?.getTime() ?? 0));
    const rest = budgets
      .filter((budget) => !budget.pinnedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return [...pinned, ...rest];
  })();

  if (!includeSummary) {
    return NextResponse.json({ data: Array.isArray(sortedBudgets) ? sortedBudgets : [] });
  }

  const budgetsWithSummary = await Promise.all(
    sortedBudgets.map(async (budget) => {
      const range = resolveMonthRangeForBudget(budget);
      if (!range.start || !range.end) {
        return { ...budget, spentMinor: 0 };
      }

      const categoryBudgetEntries = Array.isArray(budget.categoryBudgets) ? budget.categoryBudgets : [];
      const categoryIdsForSpend = categoryBudgetEntries.map((entry) => entry?.categoryId).filter(Boolean);

      if (!categoryIdsForSpend.length) {
        return { ...budget, spentMinor: 0 };
      }

      const spentMinor = await getBudgetSpend({
        workspaceId: auth.workspace.id.toString(),
        categoryIds: categoryIdsForSpend,
        accountIds: budget.accountIds ?? null,
        startDate: normalizeToUtcMidnight(range.start),
        endDate: normalizeToUtcMidnight(range.end),
      });
      return { ...budget, spentMinor };
    })
  );

  return NextResponse.json({ data: Array.isArray(budgetsWithSummary) ? budgetsWithSummary : [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  let categoryIds: mongoose.Types.ObjectId[] | null | undefined;
  let accountIds: mongoose.Types.ObjectId[] | null | undefined;
  let categoryBudgets: { categoryId: mongoose.Types.ObjectId; amountMinor: number }[] = [];

  try {
    categoryIds = parseObjectIdArrayOrNull(parsed.data.categoryIds, "category");
    accountIds = parseObjectIdArrayOrNull(parsed.data.accountIds, "account");
    categoryBudgets = parsed.data.categoryBudgets.map((row) => {
      const oid = parseObjectId(row.categoryId);
      if (!oid) {
        throw new Error("Invalid category id");
      }
      return { categoryId: oid, amountMinor: toMinorUnits(row.amount) };
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid ids", 400);
  }

  const totalBudgetMinor = categoryBudgets.reduce((sum, row) => sum + row.amountMinor, 0);

  const { startDate, endDate, startMonth } = parsed.data;

  if (parsed.data.type === "monthly") {
    if (!startMonth) {
      return errorResponse("Start month is required for monthly budgets", 400);
    }
  } else if (!startDate || !endDate) {
    return errorResponse("Start date and end date are required for custom budgets", 400);
  } else if (startDate > endDate) {
    return errorResponse("Start date must be before end date", 400);
  }

  const budget = await BudgetModel.create({
    workspaceId: auth.workspace.id,
    name: parsed.data.name.trim(),
    emoji: parsed.data.emoji ?? null,
    color: parsed.data.color ?? null,
    type: parsed.data.type,
    startMonth: parsed.data.type === "monthly" ? startMonth ?? null : null,
    startDate: parsed.data.type === "custom" ? toUtcDate(startDate!) : null,
    endDate: parsed.data.type === "custom" ? toUtcDate(endDate!) : null,
    categoryIds: categoryIds ?? null,
    accountIds: accountIds ?? null,
    categoryBudgets,
    totalBudgetMinor,
    pinnedAt: parsed.data.pinned ? new Date() : null,
    archivedAt: null,
  });

  return NextResponse.json({ data: budget });
}
