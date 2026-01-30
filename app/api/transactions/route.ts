import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { errorResponse, requireAuthContext, parseObjectId } from "@/src/server/api";

const currencySchema = z.string().trim().min(1, "Invalid currency");

const amountSchema = z
  .number()
  .positive()
  .refine(Number.isFinite, "Invalid amount");

const dateSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date");

const createSchema = z.object({
  date: dateSchema,
  amount: amountSchema,
  currency: currencySchema,
  kind: z.enum(["income", "expense"]),
  categoryId: z.string().nullable().optional(),
  note: z.string().trim().min(1).optional(),
  merchant: z.string().trim().min(1).optional(),
  receipts: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().trim().min(1).optional(),
        uploadedAt: z.string().trim().min(1).optional(),
      })
    )
    .optional(),
});

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function parseMonthRange(monthParam: string) {
  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return null;
  }

  const [yearRaw, monthRaw] = monthParam.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const monthParam = request.nextUrl.searchParams.get("month");
  if (!monthParam) {
    return errorResponse("Month is required", 400);
  }

  const range = parseMonthRange(monthParam);
  if (!range) {
    return errorResponse("Invalid month", 400);
  }

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

  const transactions = await TransactionModel.find({
    workspaceId: auth.workspace.id,
    date: { $gte: range.start, $lt: range.end },
    ...(includeArchived ? {} : { isArchived: false }),
  })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({ data: transactions });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const { categoryId, amount, date, receipts, ...rest } = parsed.data;
  const categoryObjectId = categoryId ? parseObjectId(categoryId) : null;
  if (categoryId && !categoryObjectId) {
    return errorResponse("Invalid category id", 400);
  }
  if (categoryObjectId) {
    const category = await CategoryModel.findOne({
      _id: categoryObjectId,
      workspaceId: auth.workspace.id,
    });
    if (!category) {
      return errorResponse("Category not found", 404);
    }
  }

  const transaction = await TransactionModel.create({
    workspaceId: auth.workspace.id,
    categoryId: categoryObjectId ?? null,
    amountMinor: toMinorUnits(amount),
    date: new Date(date),
    receipts: (receipts ?? []).map((receipt) => ({
      url: receipt.url,
      name: receipt.name,
      uploadedAt: receipt.uploadedAt ?? new Date().toISOString(),
    })),
    isArchived: false,
    ...rest,
  });

  return NextResponse.json({ data: transaction });
}
