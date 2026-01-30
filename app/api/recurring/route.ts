import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const scheduleSchema = z.object({
  cadence: z.literal("monthly"),
  dayOfMonth: z.number().int().min(1).max(31),
});

const baseSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().positive(),
  currency: z.string().trim().min(1),
  kind: z.enum(["expense", "income"]),
  categoryId: z.string().nullable().optional(),
  schedule: scheduleSchema,
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

const computeNextRunDate = (schedule: { dayOfMonth: number }) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(schedule.dayOfMonth, daysInMonth);
  const candidate = new Date(Date.UTC(year, monthIndex, day));
  if (candidate >= now) return candidate;
  const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
  const nextDays = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const nextDay = Math.min(schedule.dayOfMonth, nextDays);
  return new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), nextDay));
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

  const recurring = await RecurringModel.create({
    workspaceId: auth.workspace.id,
    name: parsed.data.name,
    amountMinor: toMinorUnits(parsed.data.amount),
    currency: parsed.data.currency,
    kind: parsed.data.kind,
    categoryId: categoryObjectId,
    schedule: parsed.data.schedule,
    nextRunDate: computeNextRunDate(parsed.data.schedule),
    isActive: true,
  });

  return NextResponse.json({ data: recurring });
}
