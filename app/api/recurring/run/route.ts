import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { parseMonth } from "@/src/server/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

const getRunDateForMonth = (year: number, monthIndex: number, dayOfMonth: number) => {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  return new Date(Date.UTC(year, monthIndex, day));
};

export async function POST(request: NextRequest) {
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

  const recurring = await RecurringModel.find({
    workspaceId: auth.workspace.id,
    isActive: true,
  });

  const created: string[] = [];

  for (const rule of recurring) {
    const runDate = getRunDateForMonth(
      month.year,
      month.monthIndex,
      rule.schedule.dayOfMonth
    );

    const existing = await TransactionModel.findOne({
      workspaceId: auth.workspace.id,
      recurringId: rule._id,
      date: { $gte: month.start, $lt: month.end },
    }).select("_id");

    if (existing) {
      continue;
    }

    const transaction = await TransactionModel.create({
      workspaceId: auth.workspace.id,
      recurringId: rule._id,
      categoryId: rule.categoryId ?? null,
      amountMinor: rule.amountMinor,
      currency: rule.currency,
      kind: rule.kind,
      date: runDate,
      note: `Recurring: ${rule.name}`,
      receipts: [],
      isArchived: false,
    });
    created.push(transaction._id.toString());
  }

  return NextResponse.json({ data: { created } });
}
