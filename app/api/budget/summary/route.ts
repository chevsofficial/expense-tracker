import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { currentMonth } from "@/src/server/month";
import { monthRange } from "@/src/utils/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

type ActualRow = {
  _id: { currency: string; categoryId: string | null };
  actualMinor: number;
  transactionCount: number;
};

type BudgetSummaryRow = {
  categoryId: string | null;
  categoryName: string;
  plannedMinor: number;
  actualMinor: number;
  remainingMinor: number;
  progressPct: number;
  transactionCount: number;
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const monthParam = params.get("month") ?? currentMonth();
  const parsedMonth = monthSchema.safeParse(monthParam);
  if (!parsedMonth.success) {
    return errorResponse("Invalid month", 400);
  }

  const includeArchivedCategories = params.get("includeArchivedCategories") === "true";
  const includePending = params.get("includePending") !== "false";

  const range = monthRange(parsedMonth.data);
  const start = new Date(`${range.start}T00:00:00.000Z`);
  const end = new Date(`${range.end}T00:00:00.000Z`);

  const budget = await BudgetMonthModel.findOne({
    workspaceId: auth.workspace.id,
    month: parsedMonth.data,
  });

  const budgetCurrency = budget?.currency ?? auth.workspace.defaultCurrency;
  const plannedLines = budget?.plannedLines ?? [];
  const plannedMap = new Map(
    plannedLines.map((line) => [`${budgetCurrency}:${line.categoryId.toString()}`, line.plannedAmountMinor])
  );

  const categories = await CategoryModel.find({
    workspaceId: auth.workspace.id,
    kind: "expense",
    ...(includeArchivedCategories ? {} : { isArchived: false }),
  }).select("_id nameKey nameCustom");

  const categoryMap = new Map(
    categories.map((category) => [category._id.toString(), category])
  );

  const actualRows = await TransactionModel.aggregate<ActualRow>([
    {
      $match: {
        workspaceId: auth.workspace._id,
        date: { $gte: start, $lt: end },
        kind: "expense",
        isArchived: false,
        ...(includePending ? {} : { isPending: false }),
      },
    },
    {
      $group: {
        _id: { currency: "$currency", categoryId: "$categoryId" },
        actualMinor: { $sum: "$amountMinor" },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  const actualMap = new Map<string, { actualMinor: number; transactionCount: number }>();
  const currencies = new Set<string>([budgetCurrency]);
  actualRows.forEach((row) => {
    const key = `${row._id.currency}:${row._id.categoryId ?? "uncategorized"}`;
    actualMap.set(key, { actualMinor: row.actualMinor, transactionCount: row.transactionCount });
    currencies.add(row._id.currency);
  });

  const categoryIds = new Set<string>(categories.map((category) => category._id.toString()));
  plannedLines.forEach((line) => categoryIds.add(line.categoryId.toString()));
  actualRows.forEach((row) => {
    if (row._id.categoryId) categoryIds.add(row._id.categoryId);
  });

  const currencySections = Array.from(currencies.values()).map((currency) => {
    const rows: BudgetSummaryRow[] = Array.from(categoryIds).map((categoryId) => {
      const plannedMinor = plannedMap.get(`${currency}:${categoryId}`) ?? 0;
      const actual = actualMap.get(`${currency}:${categoryId}`);
      const actualMinor = actual?.actualMinor ?? 0;
      const transactionCount = actual?.transactionCount ?? 0;
      const remainingMinor = plannedMinor - actualMinor;
      const progressPct = plannedMinor > 0 ? Math.min(actualMinor / plannedMinor, 1) : 0;
      const category = categoryMap.get(categoryId);
      return {
        categoryId,
        categoryName: category?.nameCustom?.trim() || category?.nameKey || "Untitled",
        plannedMinor,
        actualMinor,
        remainingMinor,
        progressPct,
        transactionCount,
      };
    });

    const uncategorizedActual = actualMap.get(`${currency}:uncategorized`);
    if (uncategorizedActual) {
      const plannedMinor = 0;
      const actualMinor = uncategorizedActual.actualMinor;
      const remainingMinor = plannedMinor - actualMinor;
      const progressPct = 0;
      rows.push({
        categoryId: null,
        categoryName: "Uncategorized",
        plannedMinor,
        actualMinor,
        remainingMinor,
        progressPct,
        transactionCount: uncategorizedActual.transactionCount,
      });
    }

    const totals = rows.reduce(
      (acc, row) => {
        acc.plannedMinor += row.plannedMinor;
        acc.actualMinor += row.actualMinor;
        acc.remainingMinor += row.remainingMinor;
        return acc;
      },
      { plannedMinor: 0, actualMinor: 0, remainingMinor: 0 }
    );

    return {
      currency,
      rows,
      totals,
    };
  });

  return NextResponse.json({
    data: {
      month: parsedMonth.data,
      currencies: currencySections,
    },
  });
}
