import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { BudgetModel } from "@/src/models/Budget";
import { TransactionModel } from "@/src/models/Transaction";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { monthRange } from "@/src/utils/month";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const dateSchema = z.string().refine((value) => isYmd(value), "Invalid date");

const alertsSchema = z.object({
  enabled: z.boolean(),
  thresholds: z.array(z.number().positive()),
});

const createSchema = z.object({
  name: z.string().trim().min(1),
  emoji: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
  type: z.enum(["monthly", "custom"]),
  month: z.string().trim().optional().nullable(),
  startDate: dateSchema,
  endDate: dateSchema,
  categoryIds: z.array(z.string().min(1)).nullable().optional(),
  accountIds: z.array(z.string().min(1)).nullable().optional(),
  limitAmount: z.number().nullable().optional(),
  alerts: alertsSchema.optional(),
});

function toUtcDate(date: string) {
  return normalizeToUtcMidnight(date);
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
  const endDate = new Date(`${end}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const endYmd = endDate.toISOString().slice(0, 10);
  return { start, end: endYmd };
}

async function getBudgetSpend({
  workspaceId,
  budgetId,
  startDate,
  endDate,
}: {
  workspaceId: string;
  budgetId: string;
  startDate: Date;
  endDate: Date;
}) {
  const result = await TransactionModel.aggregate<{ total: number }>([
    {
      $match: {
        workspaceId: parseObjectId(workspaceId),
        budgetId: parseObjectId(budgetId),
        isArchived: false,
        kind: "expense",
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$amountMinor" } } },
  ]);
  return result[0]?.total ?? 0;
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
    .sort({ createdAt: -1 })
    .lean();

  if (!includeSummary) {
    return NextResponse.json({ data: budgets });
  }

  const budgetsWithSummary = await Promise.all(
    budgets.map(async (budget) => {
      const spentMinor = await getBudgetSpend({
        workspaceId: auth.workspace.id.toString(),
        budgetId: budget._id.toString(),
        startDate: budget.startDate,
        endDate: budget.endDate,
      });
      return { ...budget, spentMinor };
    })
  );

  return NextResponse.json({ data: budgetsWithSummary });
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

  try {
    categoryIds = parseObjectIdArrayOrNull(parsed.data.categoryIds, "category");
    accountIds = parseObjectIdArrayOrNull(parsed.data.accountIds, "account");
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Invalid ids", 400);
  }

  let { startDate, endDate } = parsed.data;
  if (parsed.data.type === "monthly") {
    if (!parsed.data.month) {
      return errorResponse("Month is required for monthly budgets", 400);
    }
    const range = monthToRange(parsed.data.month);
    startDate = range.start;
    endDate = range.end;
  }

  if (startDate > endDate) {
    return errorResponse("Start date must be before end date", 400);
  }

  if (parsed.data.isDefault) {
    await BudgetModel.updateMany(
      { workspaceId: auth.workspace.id, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  const budget = await BudgetModel.create({
    workspaceId: auth.workspace.id,
    name: parsed.data.name.trim(),
    emoji: parsed.data.emoji ?? null,
    color: parsed.data.color ?? null,
    isDefault: parsed.data.isDefault ?? false,
    type: parsed.data.type,
    month: parsed.data.type === "monthly" ? parsed.data.month ?? null : null,
    startDate: toUtcDate(startDate),
    endDate: toUtcDate(endDate),
    categoryIds: categoryIds ?? null,
    accountIds: accountIds ?? null,
    limitAmount: parsed.data.limitAmount ?? null,
    alerts: parsed.data.alerts,
    archivedAt: null,
  });

  return NextResponse.json({ data: budget });
}
