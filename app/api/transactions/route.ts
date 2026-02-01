import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { monthRange } from "@/src/utils/month";
import { errorResponse, requireAuthContext, parseObjectId } from "@/src/server/api";

const currencySchema = z.enum(SUPPORTED_CURRENCIES);

const amountSchema = z
  .number()
  .positive()
  .refine(Number.isFinite, "Invalid amount");

const dateSchema = z
  .string()
  .refine((value) => isYmd(value) || !Number.isNaN(new Date(value).getTime()), "Invalid date");

const createSchema = z.object({
  date: dateSchema,
  amount: amountSchema,
  currency: currencySchema,
  kind: z.enum(["income", "expense"]),
  categoryId: z.string().nullable().optional(),
  note: z.string().trim().min(1).optional(),
  merchantId: z.string().nullable().optional(),
  merchantNameSnapshot: z.string().trim().min(1).nullable().optional(),
  receiptUrls: z.array(z.string().url()).optional(),
});

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

function isValidMonthParam(monthParam: string) {
  if (!/^\d{4}-\d{2}$/.test(monthParam)) return false;
  const [, monthValue] = monthParam.split("-");
  const monthNumber = Number(monthValue);
  return Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const monthParam = params.get("month");
  const kindParam = params.get("kind");
  const categoryParam = params.get("categoryId");
  const merchantParam = params.get("merchantId");
  const currencyParam = params.get("currency");
  const searchParam = params.get("q");
  const includeArchived = params.get("includeArchived") === "true";

  const filter: Record<string, unknown> = {
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { isArchived: false }),
  };

  if (monthParam) {
    if (!isValidMonthParam(monthParam)) {
      return errorResponse("Invalid month", 400);
    }
    const range = monthRange(monthParam);
    const startDate = new Date(`${range.start}T00:00:00.000Z`);
    const endDate = new Date(`${range.end}T00:00:00.000Z`);
    filter.date = { $gte: startDate, $lt: endDate };
  }

  if (kindParam) {
    if (!["income", "expense"].includes(kindParam)) {
      return errorResponse("Invalid kind", 400);
    }
    filter.kind = kindParam;
  }

  if (categoryParam) {
    const categoryId = parseObjectId(categoryParam);
    if (!categoryId) {
      return errorResponse("Invalid category id", 400);
    }
    filter.categoryId = categoryId;
  }

  if (merchantParam) {
    const merchantId = parseObjectId(merchantParam);
    if (!merchantId) {
      return errorResponse("Invalid merchant id", 400);
    }
    filter.merchantId = merchantId;
  }

  if (currencyParam) {
    if (!SUPPORTED_CURRENCIES.includes(currencyParam as (typeof SUPPORTED_CURRENCIES)[number])) {
      return errorResponse("Invalid currency", 400);
    }
    filter.currency = currencyParam;
  }

  if (searchParam) {
    const regex = { $regex: searchParam, $options: "i" };
    filter.$or = [{ note: regex }, { merchantNameSnapshot: regex }];
  }

  const transactions = await TransactionModel.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({ data: { items: transactions } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const { categoryId, amount, date, receiptUrls, merchantId, merchantNameSnapshot, ...rest } =
    parsed.data;
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

  let merchantObjectId = null;
  let resolvedMerchantNameSnapshot: string | null = merchantNameSnapshot ?? null;
  if (merchantId !== undefined) {
    if (merchantId === null) {
      merchantObjectId = null;
      resolvedMerchantNameSnapshot = null;
    } else {
      merchantObjectId = parseObjectId(merchantId);
      if (!merchantObjectId) {
        return errorResponse("Invalid merchant id", 400);
      }
      const merchant = await MerchantModel.findOne({
        _id: merchantObjectId,
        workspaceId: auth.workspace.id,
      }).lean();
      if (!merchant) {
        return errorResponse("Merchant not found", 404);
      }
      if (!resolvedMerchantNameSnapshot) {
        resolvedMerchantNameSnapshot = merchant.name;
      }
    }
  }

  const transaction = await TransactionModel.create({
    workspaceId: auth.workspace.id,
    categoryId: categoryObjectId ?? null,
    amountMinor: toMinorUnits(amount),
    date: normalizeToUtcMidnight(date),
    merchantId: merchantObjectId,
    merchantNameSnapshot: resolvedMerchantNameSnapshot,
    receiptUrls: receiptUrls ?? [],
    isArchived: false,
    ...rest,
  });

  return NextResponse.json({ data: transaction });
}
