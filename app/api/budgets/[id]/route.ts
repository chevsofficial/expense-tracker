import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { BudgetModel } from "@/src/models/Budget";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const dateSchema = z.string().refine((value) => isYmd(value), "Invalid date");

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  emoji: z.string().trim().max(8).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  type: z.enum(["monthly", "custom"]).optional(),
  startMonth: monthSchema.optional().nullable(),
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
    .optional(),
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

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
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
  if (parsed.data.startMonth !== undefined) update.startMonth = parsed.data.startMonth ?? null;
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

  if (parsed.data.categoryBudgets !== undefined) {
    try {
      const parsedBudgets = parsed.data.categoryBudgets.map((row) => {
        const oid = parseObjectId(row.categoryId);
        if (!oid) {
          throw new Error("Invalid category id");
        }
        return { categoryId: oid, amountMinor: toMinorUnits(row.amount) };
      });
      update.categoryBudgets = parsedBudgets;
      update.totalBudgetMinor = parsedBudgets.reduce((sum, row) => sum + row.amountMinor, 0);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Invalid category ids", 400);
    }
  }

  const updatingMonthly = parsed.data.type === "monthly" || parsed.data.startMonth !== undefined;
  const updatingCustom =
    parsed.data.type === "custom" ||
    parsed.data.startDate !== undefined ||
    parsed.data.endDate !== undefined;

  if (updatingMonthly && updatingCustom) {
    return errorResponse("Provide either monthly or custom budget period updates", 400);
  }

  if (updatingMonthly) {
    const startMonth = parsed.data.startMonth ?? null;
    if (!startMonth) {
      return errorResponse("Start month is required for monthly budgets", 400);
    }
    update.type = "monthly";
    update.startMonth = startMonth;
    update.startDate = null;
    update.endDate = null;
  }

  if (updatingCustom) {
    const resolvedStart = parsed.data.startDate;
    const resolvedEnd = parsed.data.endDate;
    if (!resolvedStart || !resolvedEnd) {
      return errorResponse("Start date and end date are required for custom budgets", 400);
    }
    if (resolvedStart > resolvedEnd) {
      return errorResponse("Start date must be before end date", 400);
    }
    update.type = "custom";
    update.startMonth = null;
    update.startDate = toUtcDate(resolvedStart);
    update.endDate = toUtcDate(resolvedEnd);
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

export async function DELETE(
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

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    await BudgetModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });
    return NextResponse.json({ data: { deleted: true } });
  }

  const budget = await BudgetModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: { archivedAt: new Date() } },
    { new: true }
  );

  if (!budget) {
    return errorResponse("Budget not found", 404);
  }

  return NextResponse.json({ data: budget });
}
