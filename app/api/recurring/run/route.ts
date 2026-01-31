import { NextResponse, type NextRequest } from "next/server";
import { RecurringModel } from "@/src/models/Recurring";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse } from "@/src/server/api";
import { dbConnect } from "@/src/db/mongoose";

const normalizeUtcDate = (value: Date) => {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};

const addWeeks = (value: Date, interval: number) => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + interval * 7);
  return normalizeUtcDate(next);
};

const addMonths = (value: Date, interval: number, dayOfMonth: number) => {
  const year = value.getUTCFullYear();
  const monthIndex = value.getUTCMonth() + interval;
  const target = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
};

const getNextRun = (
  current: Date,
  schedule: { frequency: "monthly" | "weekly"; interval: number; dayOfMonth?: number }
) => {
  if (schedule.frequency === "weekly") {
    return addWeeks(current, schedule.interval);
  }
  return addMonths(current, schedule.interval, schedule.dayOfMonth ?? current.getUTCDate());
};

export async function POST(request: NextRequest) {
  await dbConnect();
  const secret = process.env.RECURRING_RUN_SECRET;
  if (!secret) {
    return errorResponse("Recurring secret not configured", 500);
  }

  const provided = request.headers.get("x-recurring-secret");
  if (provided !== secret) {
    return errorResponse("Unauthorized", 401);
  }

  const now = normalizeUtcDate(new Date());
  const recurring = await RecurringModel.find({
    isArchived: false,
    nextRunAt: { $lte: now },
  });

  const created: string[] = [];

  for (const rule of recurring) {
    let nextRunAt = normalizeUtcDate(rule.nextRunAt);
    while (nextRunAt <= now) {
      const existing = await TransactionModel.findOne({
        workspaceId: rule.workspaceId,
        recurringId: rule._id,
        date: nextRunAt,
      }).select("_id");

      if (!existing) {
        const transaction = await TransactionModel.create({
          workspaceId: rule.workspaceId,
          recurringId: rule._id,
          categoryId: rule.categoryId ?? null,
          merchantId: rule.merchantId ?? null,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          kind: rule.kind,
          date: nextRunAt,
          note: rule.name ? `Recurring: ${rule.name}` : undefined,
          receiptUrls: [],
          isPending: true,
          isArchived: false,
        });
        created.push(transaction._id.toString());
      }

      nextRunAt = getNextRun(nextRunAt, rule.schedule);
    }

    await RecurringModel.updateOne(
      { _id: rule._id },
      { nextRunAt }
    );
  }

  return NextResponse.json({ data: { created } });
}
