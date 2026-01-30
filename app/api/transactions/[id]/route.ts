import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const amountSchema = z
  .number()
  .positive()
  .refine(Number.isFinite, "Invalid amount");

const dateSchema = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date");

const updateSchema = z.object({
  date: dateSchema.optional(),
  amount: amountSchema.optional(),
  categoryId: z.string().nullable().optional(),
  note: z.string().trim().min(1).optional(),
  merchant: z.string().trim().min(1).optional(),
  receipts: z.array(z.string().min(1)).optional(),
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
    update.date = new Date(parsed.data.date);
  }

  if (parsed.data.amount !== undefined) {
    update.amountMinor = toMinorUnits(parsed.data.amount);
  }

  if (parsed.data.categoryId !== undefined) {
    if (parsed.data.categoryId === null) {
      update.categoryId = null;
    } else {
      const categoryObjectId = parseObjectId(parsed.data.categoryId);
      if (!categoryObjectId) {
        return errorResponse("Invalid category id", 400);
      }
      update.categoryId = categoryObjectId;
    }
  }

  if (parsed.data.note !== undefined) {
    update.note = parsed.data.note;
  }

  if (parsed.data.merchant !== undefined) {
    update.merchant = parsed.data.merchant;
  }

  if (parsed.data.receipts !== undefined) {
    update.receipts = parsed.data.receipts;
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
