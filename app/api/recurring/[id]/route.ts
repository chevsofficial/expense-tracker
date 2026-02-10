import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";
import { isDateOnlyString, parseDateOnly, toDateOnlyString } from "@/src/server/dates";
import { computeNextRunAt } from "@/src/utils/recurring";

const scheduleSchema = z
  .object({
    frequency: z.enum(["monthly", "weekly"]),
    interval: z.number().int().min(1),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
  })
  .optional();

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  kind: z.enum(["expense", "income"]).optional(),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  schedule: scheduleSchema,
  startDate: z
    .string()
    .refine((value) => isDateOnlyString(value), "Invalid date")
    .optional(),
  isArchived: z.boolean().optional(),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

const resolveNextRunOn = (
  schedule: { frequency: "monthly" | "weekly"; interval: number; dayOfMonth?: number },
  startDate: string
) => {
  const today = toDateOnlyString(new Date());
  let nextRunOn = startDate;
  if (nextRunOn >= today) return nextRunOn;

  let cursor = nextRunOn;
  while (cursor < today) {
    const next = computeNextRunAt({
      frequency: schedule.frequency,
      interval: schedule.interval,
      dayOfMonth: schedule.dayOfMonth,
      startDate,
      fromDate: cursor,
    });
    if (next <= cursor) break;
    cursor = next;
  }
  return cursor;
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
  if (parsed.data.kind !== undefined) update.kind = parsed.data.kind;
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

  const startDate = parsed.data.startDate ?? recurring.startDate;
  const parsedStart = parseDateOnly(startDate);
  if (!parsedStart) {
    return errorResponse("Invalid date", 400);
  }
  const schedule = {
    ...(parsed.data.schedule ?? recurring.schedule),
    ...((parsed.data.schedule?.frequency ?? recurring.schedule.frequency) === "monthly"
      ? {
          dayOfMonth:
            parsed.data.schedule?.dayOfMonth ??
            recurring.schedule.dayOfMonth ??
            parsedStart.d,
        }
      : { dayOfMonth: undefined }),
  } as { frequency: "monthly" | "weekly"; interval: number; dayOfMonth?: number };

  if (parsed.data.startDate !== undefined) {
    update.startDate = startDate;
  }

  if (parsed.data.schedule !== undefined) {
    update.schedule = schedule;
  }

  if (parsed.data.startDate !== undefined || parsed.data.schedule !== undefined) {
    update.nextRunOn = resolveNextRunOn(schedule, startDate);
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

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    const deleted = await RecurringModel.deleteOne({
      _id: objectId,
      workspaceId: auth.workspace.id,
    });
    if (!deleted.deletedCount) {
      return errorResponse("Recurring not found", 404);
    }
    return NextResponse.json({ data: { deleted: true } });
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
