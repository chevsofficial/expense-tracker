import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";
import { isDateOnlyString, parseDateOnly, toDateOnlyString } from "@/src/server/dates";
import { computeNextRunAt } from "@/src/utils/recurring";
import { getWorkspaceCurrency } from "@/src/lib/currency";

const scheduleSchema = z.object({
  frequency: z.enum(["monthly", "weekly"]),
  interval: z.number().int().min(1),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
});

const baseSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().positive(),
  kind: z.enum(["expense", "income"]),
  categoryId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  schedule: scheduleSchema,
  startDate: z.string().refine((value) => isDateOnlyString(value), "Invalid date"),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

const resolveNextRunOn = (schedule: { frequency: "monthly" | "weekly"; interval: number; dayOfMonth?: number }, startDate: string) => {
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

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

  const recurring = await RecurringModel.find({
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { isArchived: false }),
  }).sort({
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

  const parsedStart = parseDateOnly(parsed.data.startDate);
  if (!parsedStart) {
    return errorResponse("Invalid date", 400);
  }
  const schedule =
    parsed.data.schedule.frequency === "monthly"
      ? {
          ...parsed.data.schedule,
          dayOfMonth: parsed.data.schedule.dayOfMonth ?? parsedStart.d,
        }
      : {
          ...parsed.data.schedule,
          dayOfMonth: undefined,
        };

  const nextRunOn = resolveNextRunOn(schedule, parsed.data.startDate);

  const recurring = await RecurringModel.create({
    workspaceId: auth.workspace.id,
    name: parsed.data.name,
    amountMinor: toMinorUnits(parsed.data.amount),
    currency: getWorkspaceCurrency(auth.workspace),
    kind: parsed.data.kind,
    categoryId: categoryObjectId,
    merchantId: merchantObjectId,
    schedule,
    startDate: parsed.data.startDate,
    nextRunOn,
    isArchived: false,
  });

  return NextResponse.json({ data: recurring });
}
