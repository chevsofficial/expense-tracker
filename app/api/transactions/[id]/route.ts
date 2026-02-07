import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { CategoryModel } from "@/src/models/Category";
import { MerchantModel } from "@/src/models/Merchant";
import { AccountModel } from "@/src/models/Account";
import { BudgetModel } from "@/src/models/Budget";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const amountSchema = z
  .number()
  .positive()
  .refine(Number.isFinite, "Invalid amount");

const dateSchema = z
  .string()
  .refine((value) => isYmd(value) || !Number.isNaN(new Date(value).getTime()), "Invalid date");

const updateSchema = z.object({
  date: dateSchema.optional(),
  amount: amountSchema.optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  kind: z.enum(["income", "expense"]).optional(),
  accountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  budgetId: z.string().nullable().optional(),
  note: z.string().trim().min(1).optional(),
  merchantId: z.string().nullable().optional(),
  merchantNameSnapshot: z.string().trim().min(1).nullable().optional(),
  receiptUrls: z.array(z.string().url()).optional(),
  isArchived: z.boolean().optional(),
});

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid transaction id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.date) {
    update.date = normalizeToUtcMidnight(parsed.data.date);
  }

  if (parsed.data.amount !== undefined) {
    update.amountMinor = toMinorUnits(parsed.data.amount);
  }

  if (parsed.data.currency !== undefined) {
    update.currency = parsed.data.currency;
  }

  if (parsed.data.kind !== undefined) {
    update.kind = parsed.data.kind;
  }

  if (parsed.data.accountId !== undefined) {
    if (parsed.data.accountId === null) {
      update.accountId = null;
    } else {
      const accountObjectId = parseObjectId(parsed.data.accountId);
      if (!accountObjectId) {
        return errorResponse("Invalid account id", 400);
      }
      const account = await AccountModel.findOne({
        _id: accountObjectId,
        workspaceId: auth.workspace.id,
      });
      if (!account) {
        return errorResponse("Account not found", 404);
      }
      update.accountId = accountObjectId;
    }
  }

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

  if (parsed.data.budgetId !== undefined) {
    if (parsed.data.budgetId === null) {
      update.budgetId = null;
    } else {
      const budgetObjectId = parseObjectId(parsed.data.budgetId);
      if (!budgetObjectId) {
        return errorResponse("Invalid budget id", 400);
      }
      const budget = await BudgetModel.findOne({
        _id: budgetObjectId,
        workspaceId: auth.workspace.id,
      });
      if (!budget) {
        return errorResponse("Budget not found", 404);
      }
      update.budgetId = budgetObjectId;
    }
  }

  if (parsed.data.note !== undefined) {
    update.note = parsed.data.note;
  }

  if (parsed.data.merchantId !== undefined) {
    if (parsed.data.merchantId === null) {
      update.merchantId = null;
      update.merchantNameSnapshot = null;
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

  if (parsed.data.merchantNameSnapshot !== undefined) {
    update.merchantNameSnapshot = parsed.data.merchantNameSnapshot ?? null;
  }

  if (parsed.data.receiptUrls !== undefined) {
    update.receiptUrls = parsed.data.receiptUrls;
  }

  if (parsed.data.isArchived !== undefined) {
    update.isArchived = parsed.data.isArchived;
  }

  if (Object.keys(update).length === 0) {
    return errorResponse("No updates provided", 400);
  }

  const transaction = await TransactionModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    update,
    { new: true }
  );

  if (!transaction) {
    return errorResponse("Transaction not found", 404);
  }

  return NextResponse.json({ data: transaction });
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
    return errorResponse("Invalid transaction id", 400);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    const hasReferences = false;
    if (hasReferences) {
      return errorResponse(
        "Cannot permanently delete: transaction is referenced by historical data. Archive instead.",
        400
      );
    }

    await TransactionModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });
    return NextResponse.json({ data: { deleted: true } });
  }

  const transaction = await TransactionModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { isArchived: true },
    { new: true }
  );

  if (!transaction) {
    return errorResponse("Transaction not found", 404);
  }

  return NextResponse.json({ data: transaction });
}
