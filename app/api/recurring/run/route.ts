import { NextResponse, type NextRequest } from "next/server";
import { RecurringModel } from "@/src/models/Recurring";
import { TransactionModel } from "@/src/models/Transaction";
import { dbConnect } from "@/src/db/mongoose";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import {
  addDaysDateOnly,
  addMonthsDateOnly,
  dateOnlyToDate,
  parseDateOnly,
  toDateOnlyString,
} from "@/src/server/dates";

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const cronSecret = process.env.CRON_SECRET;
    const provided = request.headers.get("x-cron-secret");
    const isCronAuthorized = Boolean(cronSecret && provided === cronSecret);

    if (!isCronAuthorized) {
      const auth = await requireAuthContext();
      if ("response" in auth) return auth.response;
    }

    const today = toDateOnlyString(new Date());
    const recurring = await RecurringModel.find({
      isArchived: false,
      nextRunOn: { $lte: today },
    });

    const created: string[] = [];

    for (const rule of recurring) {
      if (!rule.nextRunOn) {
        console.warn("Recurring missing nextRunOn", { recurringId: rule._id.toString() });
        continue;
      }
      if (!parseDateOnly(rule.nextRunOn)) {
        console.warn("Recurring invalid nextRunOn", {
          recurringId: rule._id.toString(),
          nextRunOn: rule.nextRunOn,
        });
        continue;
      }

      const startParts = parseDateOnly(rule.startDate);
      const scheduleDayOfMonth =
        rule.schedule.frequency === "monthly"
          ? rule.schedule.dayOfMonth ?? startParts?.d ?? parseDateOnly(rule.nextRunOn)?.d ?? 1
          : undefined;

      let nextRunOn = rule.nextRunOn;
      while (nextRunOn <= today) {
        const existing = await TransactionModel.findOne({
          workspaceId: rule.workspaceId,
          sourceRecurringId: rule._id,
          sourceOccurrenceOn: nextRunOn,
        }).select("_id");

        if (!existing) {
          const date = dateOnlyToDate(nextRunOn);
          if (!date) {
            console.warn("Recurring invalid occurrence date", {
              recurringId: rule._id.toString(),
              occurrence: nextRunOn,
            });
            break;
          }
          const transaction = await TransactionModel.create({
            workspaceId: rule.workspaceId,
            recurringId: rule._id,
            sourceRecurringId: rule._id,
            sourceOccurrenceOn: nextRunOn,
            categoryId: rule.categoryId ?? null,
            merchantId: rule.merchantId ?? null,
            amountMinor: rule.amountMinor,
            currency: rule.currency,
            kind: rule.kind,
            date,
            note: rule.name ? `Recurring: ${rule.name}` : undefined,
            receiptUrls: [],
            isPending: true,
            isArchived: false,
          });
          created.push(transaction._id.toString());
        }

        if (rule.schedule.frequency === "weekly") {
          const next = addDaysDateOnly(nextRunOn, rule.schedule.interval * 7);
          if (!next) break;
          nextRunOn = next;
        } else {
          const next = addMonthsDateOnly(
            nextRunOn,
            rule.schedule.interval,
            scheduleDayOfMonth ?? 1
          );
          if (!next) break;
          nextRunOn = next;
        }
      }

      await RecurringModel.updateOne({ _id: rule._id }, { nextRunOn });
    }

    return NextResponse.json({ data: { created } });
  } catch (err) {
    console.error("recurring/run failed", err);
    return errorResponse("Recurring run failed", 500);
  }
}
