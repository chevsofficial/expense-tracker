import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const scheduleSchema = z.object({
  frequency: z.enum(["monthly", "weekly"]),
  interval: z.number().int().min(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
}).superRefine((value, context) => {
  if (value.frequency === "monthly" && !value.dayOfMonth) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Day of month is required." });
  }
});

const baseSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().min(1),
  kind: z.enum(["expense", "income"]),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  schedule: scheduleSchema,
  startDate: z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date"),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

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

const getMonthlyRunDate = (base: Date, dayOfMonth: number) => {
  const year = base.getUTCFullYear();
  const monthIndex = base.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  return new Date(Date.UTC(year, monthIndex, day));
};

const computeNextRunAt = (
  startDate: Date,
  schedule: { frequency: "monthly" | "weekly"; interval: number; dayOfMonth?: number }
) => {
  const now = normalizeUtcDate(new Date());
  const baseline = normalizeUtcDate(startDate);
  const target = baseline > now ? baseline : now;
  let next =
    schedule.frequency === "monthly"
      ? getMonthlyRunDate(startDate, schedule.dayOfMonth ?? startDate.getUTCDate())
      : normalizeUtcDate(startDate);
  while (next < target) {
    next =
      schedule.frequency === "monthly"
        ? addMonths(next, schedule.interval, schedule.dayOfMonth ?? startDate.getUTCDate())
        : addWeeks(next, schedule.interval);
  }
  return next;
};

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const recurring = await RecurringModel.find({ workspaceId: auth.workspace.id }).sort({
    createdAt: -1,
  });

  return NextResponse.json({ data: recurring });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = baseSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  let categoryObjectId = null;
  if (parsed.data.categoryId) {
    categoryObjectId = parseObjectId(parsed.data.categoryId);
    if (!categoryObjectId) {
      return errorResponse("Invalid category id", 400);
    }
    const category = await CategoryModel.findOne({
      _id: categoryObjectId,
      workspaceId: auth.workspace.id,
    });
    if (!category) {
      return errorResponse("Category not found", 404);
    }
  }

  let merchantObjectId = null;
  if (parsed.data.merchantId !== undefined) {
    if (parsed.data.merchantId === null) {
      merchantObjectId = null;
    } else {
      merchantObjectId = parseObjectId(parsed.data.merchantId);
      if (!merchantObjectId) {
        return errorResponse("Invalid merchant id", 400);
      }
      const merchant = await MerchantModel.findOne({
        _id: merchantObjectId,
        workspaceId: auth.workspace.id,
      });
      if (!merchant) {
        return errorResponse("Merchant not found", 404);
      }
    }
  }

  const startDate = new Date(parsed.data.startDate);

  const recurring = await RecurringModel.create({
    workspaceId: auth.workspace.id,
    name: parsed.data.name,
    amountMinor: toMinorUnits(parsed.data.amount),
    currency: parsed.data.currency,
    kind: parsed.data.kind,
    categoryId: categoryObjectId,
    merchantId: merchantObjectId,
    schedule: parsed.data.schedule,
    startDate,
    nextRunAt: computeNextRunAt(startDate, parsed.data.schedule),
    isArchived: false,
  });

  return NextResponse.json({ data: recurring });
}
