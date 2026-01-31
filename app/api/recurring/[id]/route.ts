import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const scheduleSchema = z
  .object({
    frequency: z.enum(["monthly", "weekly"]),
    interval: z.number().int().min(1),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  })
  .superRefine((value, context) => {
    if (value.frequency === "monthly" && !value.dayOfMonth) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Day of month is required." });
    }
  })
  .optional();

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().min(1).optional(),
  kind: z.enum(["expense", "income"]).optional(),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  schedule: scheduleSchema,
  startDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date")
    .optional(),
  isArchived: z.boolean().optional(),
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid recurring id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const recurring = await RecurringModel.findOne({
    _id: objectId,
    workspaceId: auth.workspace.id,
  });

  if (!recurring) {
    return errorResponse("Recurring not found", 404);
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.amount !== undefined) update.amountMinor = toMinorUnits(parsed.data.amount);
  if (parsed.data.currency !== undefined) update.currency = parsed.data.currency;
  if (parsed.data.kind !== undefined) update.kind = parsed.data.kind;
  if (parsed.data.schedule !== undefined) update.schedule = parsed.data.schedule;
  if (parsed.data.isArchived !== undefined) update.isArchived = parsed.data.isArchived;

  if (parsed.data.categoryId !== undefined) {
    if (parsed.data.categoryId === null) {
      update.categoryId = null;
    } else {
      const categoryObjectId = parseObjectId(parsed.data.categoryId);
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
      update.categoryId = categoryObjectId;
    }
  }

  if (parsed.data.merchantId !== undefined) {
    if (parsed.data.merchantId === null) {
      update.merchantId = null;
    } else {
      const merchantObjectId = parseObjectId(parsed.data.merchantId);
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
      update.merchantId = merchantObjectId;
    }
  }

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : recurring.startDate;
  const schedule = (parsed.data.schedule ?? recurring.schedule) as {
    frequency: "monthly" | "weekly";
    interval: number;
    dayOfMonth?: number;
  };

  if (parsed.data.startDate !== undefined) {
    update.startDate = startDate;
  }

  if (parsed.data.schedule !== undefined || parsed.data.startDate !== undefined) {
    update.nextRunAt = computeNextRunAt(startDate, schedule);
  }

  const updated = await RecurringModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    update,
    { new: true }
  );

  if (!updated) {
    return errorResponse("Recurring not found", 404);
  }

  return NextResponse.json({ data: updated });
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
    return errorResponse("Invalid recurring id", 400);
  }

  const recurring = await RecurringModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { isArchived: true },
    { new: true }
  );

  if (!recurring) {
    return errorResponse("Recurring not found", 404);
  }

  return NextResponse.json({ data: recurring });
}
