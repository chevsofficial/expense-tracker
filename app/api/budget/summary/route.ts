import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { parseMonth } from "@/src/server/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const monthParam = request.nextUrl.searchParams.get("month");
  const parsedMonth = monthParam ? monthSchema.safeParse(monthParam) : null;
  if (!parsedMonth?.success) {
    return errorResponse("Invalid month", 400);
  }

  const month = parseMonth(parsedMonth.data);
  if (!month) {
    return errorResponse("Invalid month", 400);
  }

  const budget = await BudgetMonthModel.findOne({
    workspaceId: auth.workspace.id,
    month: parsedMonth.data,
  });

  const plannedLines = budget?.plannedLines ?? [];
  const plannedByCategory = new Map(
    plannedLines.map((line) => [line.categoryId.toString(), line.plannedAmountMinor])
  );

  const spentByCategory = await TransactionModel.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        workspaceId: auth.workspace._id,
        date: { $gte: month.start, $lt: month.end },
        kind: "expense",
        isArchived: false,
        categoryId: { $ne: null },
      },
    },
    { $group: { _id: "$categoryId", total: { $sum: "$amountMinor" } } },
  ]);

  const spentMap = new Map(spentByCategory.map((row) => [row._id.toString(), row.total]));

  const categoryIds = new Set<string>([
    ...plannedByCategory.keys(),
    ...spentMap.keys(),
  ]);

  const byCategory = Array.from(categoryIds).map((categoryId) => {
    const plannedMinor = plannedByCategory.get(categoryId) ?? 0;
    const spentMinor = spentMap.get(categoryId) ?? 0;
    return {
      categoryId,
      plannedMinor,
      spentMinor,
      remainingMinor: plannedMinor - spentMinor,
    };
  });

  const totalPlannedMinor = Array.from(plannedByCategory.values()).reduce((sum, value) => sum + value, 0);
  const totalSpentMinor = Array.from(spentMap.values()).reduce((sum, value) => sum + value, 0);

  return NextResponse.json({
    data: {
      month: parsedMonth.data,
      currency: budget?.currency ?? auth.workspace.defaultCurrency,
      totalPlannedMinor,
      totalSpentMinor,
      remainingMinor: totalPlannedMinor - totalSpentMinor,
      byCategory,
    },
  });
}
