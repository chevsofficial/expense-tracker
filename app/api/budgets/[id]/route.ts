import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { BudgetModel } from "@/src/models/Budget";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { monthRange } from "@/src/utils/month";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const dateSchema = z.string().refine((value) => isYmd(value), "Invalid date");

const alertsSchema = z.object({
  enabled: z.boolean(),
  thresholds: z.array(z.number().positive()),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  emoji: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
  type: z.enum(["monthly", "custom"]).optional(),
  month: z.string().trim().optional().nullable(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  categoryIds: z.array(z.string().min(1)).nullable().optional(),
  accountIds: z.array(z.string().min(1)).nullable().optional(),
  limitAmount: z.number().nullable().optional(),
  alerts: alertsSchema.optional(),
  archivedAt: z.string().nullable().optional(),
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid budget id", 400);
  }

  const budget = await BudgetModel.findOne({ _id: objectId, workspaceId: auth.workspace.id });
  if (!budget) {
    return errorResponse("Budget not found", 404);
  }

  return NextResponse.json({ data: budget });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid budget id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) update.name = parsed.data.name.trim();
  if (parsed.data.emoji !== undefined) update.emoji = parsed.data.emoji ?? null;
  if (parsed.data.color !== undefined) update.color = parsed.data.color ?? null;
  if (parsed.data.type !== undefined) update.type = parsed.data.type;
  if (parsed.data.month !== undefined) update.month = parsed.data.month ?? null;
  if (parsed.data.limitAmount !== undefined) update.limitAmount = parsed.data.limitAmount ?? null;
  if (parsed.data.alerts !== undefined) update.alerts = parsed.data.alerts;
  if (parsed.data.archivedAt !== undefined) {
    update.archivedAt = parsed.data.archivedAt ? new Date(parsed.data.archivedAt) : null;
  }

  if (parsed.data.categoryIds !== undefined) {
    try {
      update.categoryIds = parseObjectIdArrayOrNull(parsed.data.categoryIds, "category");
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid ids", 400);
    }
  }

  if (parsed.data.accountIds !== undefined) {
    try {
      update.accountIds = parseObjectIdArrayOrNull(parsed.data.accountIds, "account");
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid ids", 400);
    }
  }

  let resolvedStart = parsed.data.startDate;
  let resolvedEnd = parsed.data.endDate;

  if (parsed.data.type === "monthly" || parsed.data.month) {
    const monthValue = parsed.data.month;
    if (!monthValue) {
      return errorResponse("Month is required for monthly budgets", 400);
    }
    const range = monthToRange(monthValue);
    resolvedStart = range.start;
    resolvedEnd = range.end;
  }

  if (resolvedStart) update.startDate = toUtcDate(resolvedStart);
  if (resolvedEnd) update.endDate = toUtcDate(resolvedEnd);

  if (parsed.data.isDefault) {
    await BudgetModel.updateMany(
      { workspaceId: auth.workspace.id, isDefault: true },
      { $set: { isDefault: false } }
    );
    update.isDefault = true;
  } else if (parsed.data.isDefault === false) {
    update.isDefault = false;
  }

  if (Object.keys(update).length === 0) {
    return errorResponse("No updates provided", 400);
  }

  const budget = await BudgetModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    update,
    { new: true }
  );

  if (!budget) {
    return errorResponse("Budget not found", 404);
  }

  return NextResponse.json({ data: budget });
}
