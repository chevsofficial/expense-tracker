import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { CategoryModel } from "@/src/models/Category";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";
import { parseMonth } from "@/src/server/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

const plannedLineSchema = z.object({
  categoryId: z.string().min(1),
  plannedAmount: z.number().nonnegative(),
});

const upsertSchema = z.object({
  currency: z.string().trim().min(1).optional(),
  plannedLines: z.array(plannedLineSchema),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

async function getOrCreateBudget(workspaceId: string, month: string, currency: string) {
  const existing = await BudgetMonthModel.findOne({ workspaceId, month });
  if (existing) return existing;
  return BudgetMonthModel.create({
    workspaceId,
    month,
    currency,
    plannedLines: [],
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const monthParam = request.nextUrl.searchParams.get("month");
  const parsedMonth = monthParam ? monthSchema.safeParse(monthParam) : null;
  if (!parsedMonth?.success) {
    return errorResponse("Invalid month", 400);
  }

  if (!parseMonth(parsedMonth.data)) {
    return errorResponse("Invalid month", 400);
  }

  const budget = await getOrCreateBudget(
    auth.workspace.id,
    parsedMonth.data,
    auth.workspace.defaultCurrency
  );

  return NextResponse.json({ data: budget });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const monthParam = request.nextUrl.searchParams.get("month");
  const parsedMonth = monthParam ? monthSchema.safeParse(monthParam) : null;
  if (!parsedMonth?.success || !parseMonth(parsedMonth.data)) {
    return errorResponse("Invalid month", 400);
  }

  const body = await request.json().catch(() => null);
  const parsedBody = upsertSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse(parsedBody.error.message, 400);
  }

  const categoryIds = parsedBody.data.plannedLines.map((line) => line.categoryId);
  const objectIds = categoryIds
    .map((id) => parseObjectId(id))
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
  if (objectIds.length !== categoryIds.length) {
    return errorResponse("Invalid category id", 400);
  }

  const categories = await CategoryModel.find({
    _id: { $in: objectIds },
    workspaceId: auth.workspace.id,
  }).select("_id");

  if (categories.length !== objectIds.length) {
    return errorResponse("Category not found", 404);
  }

  const budget = await getOrCreateBudget(
    auth.workspace.id,
    parsedMonth.data,
    parsedBody.data.currency ?? auth.workspace.defaultCurrency
  );

  const plannedMap = new Map(
    budget.plannedLines.map((line) => [line.categoryId.toString(), line])
  );

  for (const line of parsedBody.data.plannedLines) {
    const plannedAmountMinor = toMinorUnits(line.plannedAmount);
    const existing = plannedMap.get(String(line.categoryId));
    if (plannedAmountMinor <= 0) {
      plannedMap.delete(String(line.categoryId));
      continue;
    }
    if (existing) {
      existing.plannedAmountMinor = plannedAmountMinor;
      existing.kind = "expense";
    } else {
      const categoryObjectId = parseObjectId(line.categoryId);
      if (!categoryObjectId) {
        return errorResponse("Invalid categoryId in plannedLines", 400);
      }

      plannedMap.set(String(line.categoryId), {
        categoryId: categoryObjectId,
        plannedAmountMinor,
        kind: "expense",
      });
    }
  }

  budget.currency = parsedBody.data.currency ?? budget.currency;
  budget.plannedLines = Array.from(plannedMap.values());
  await budget.save();

  return NextResponse.json({ data: budget });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const monthParam = request.nextUrl.searchParams.get("month");
  const parsedMonth = monthParam ? monthSchema.safeParse(monthParam) : null;
  if (!parsedMonth?.success || !parseMonth(parsedMonth.data)) {
    return errorResponse("Invalid month", 400);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    await BudgetMonthModel.deleteOne({ workspaceId: auth.workspace.id, month: parsedMonth.data });
    return NextResponse.json({ data: { deleted: true } });
  }

  const budget = await getOrCreateBudget(
    auth.workspace.id,
    parsedMonth.data,
    auth.workspace.defaultCurrency
  );
  budget.plannedLines = [];
  await budget.save();

  return NextResponse.json({ data: budget });
}
