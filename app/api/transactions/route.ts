import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { AccountModel } from "@/src/models/Account";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { monthRange } from "@/src/utils/month";
import { errorResponse, requireAuthContext, parseObjectId } from "@/src/server/api";
import { getWorkspaceCurrency } from "@/src/lib/currency";

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
  kind: z.enum(["income", "expense"]),
  accountId: z.string().nullable().optional(),
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

const addDays = (date: Date, days: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const monthParam = params.get("month");
  const kindParam = params.get("kind");
  const categoryParam = params.get("categoryId");
  const categoryIdsParam = params.get("categoryIds");
  const merchantParam = params.get("merchantId");
  const accountParam = params.get("accountId");
  const accountIdsParam = params.get("accountIds");
  const searchParam = params.get("q");
  const startDateParam = params.get("startDate");
  const endDateParam = params.get("endDate");
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

  if (startDateParam || endDateParam) {
    if (startDateParam && !isYmd(startDateParam)) {
      return errorResponse("Invalid start date", 400);
    }
    if (endDateParam && !isYmd(endDateParam)) {
      return errorResponse("Invalid end date", 400);
    }
    const startDate = startDateParam ? normalizeToUtcMidnight(startDateParam) : undefined;
    const endDateExclusive = endDateParam
      ? addDays(normalizeToUtcMidnight(endDateParam), 1)
      : undefined;
    filter.date = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDateExclusive ? { $lt: endDateExclusive } : {}),
    };
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

  if (categoryIdsParam) {
    const ids = categoryIdsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const parsedIds = ids
      .map((value) => parseObjectId(value))
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
    if (parsedIds.length !== ids.length) {
      return errorResponse("Invalid category ids", 400);
    }
    filter.categoryId = { $in: parsedIds };
  }

  if (merchantParam) {
    const merchantId = parseObjectId(merchantParam);
    if (!merchantId) {
      return errorResponse("Invalid merchant id", 400);
    }
    filter.merchantId = merchantId;
  }

  if (accountParam) {
    const accountId = parseObjectId(accountParam);
    if (!accountId) {
      return errorResponse("Invalid account id", 400);
    }
    filter.accountId = accountId;
  }

  if (accountIdsParam) {
    const ids = accountIdsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const parsedIds = ids
      .map((value) => parseObjectId(value))
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
    if (parsedIds.length !== ids.length) {
      return errorResponse("Invalid account ids", 400);
    }
    filter.accountId = { $in: parsedIds };
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

  const {
    accountId,
    categoryId,
    amount,
    date,
    receiptUrls,
    merchantId,
    merchantNameSnapshot,
    kind,
    ...rest
  } = parsed.data;
  const categoryObjectId = categoryId ? parseObjectId(categoryId) : null;
  if (categoryId && !categoryObjectId) {
    return errorResponse("Invalid category id", 400);
  }
  let resolvedKind = kind;
  if (categoryObjectId) {
    const category = await CategoryModel.findOne({
      _id: categoryObjectId,
      workspaceId: auth.workspace.id,
    });
    if (!category) {
      return errorResponse("Category not found", 404);
    }
    resolvedKind = category.kind;
  }

  const accountObjectId = accountId ? parseObjectId(accountId) : null;
  if (accountId && !accountObjectId) {
    return errorResponse("Invalid account id", 400);
  }
  if (accountObjectId) {
    const account = await AccountModel.findOne({
      _id: accountObjectId,
      workspaceId: auth.workspace.id,
    });
    if (!account) {
      return errorResponse("Account not found", 404);
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
    accountId: accountObjectId ?? null,
    categoryId: categoryObjectId ?? null,
    amountMinor: toMinorUnits(amount),
    currency: getWorkspaceCurrency(auth.workspace),
    date: normalizeToUtcMidnight(date),
    merchantId: merchantObjectId,
    merchantNameSnapshot: resolvedMerchantNameSnapshot,
    receiptUrls: receiptUrls ?? [],
    isArchived: false,
    kind: resolvedKind,
    ...rest,
  });

  return NextResponse.json({ data: transaction });
}
