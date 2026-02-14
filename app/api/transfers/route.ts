import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AccountModel } from "@/src/models/Account";
import { TransactionModel } from "@/src/models/Transaction";
import { getWorkspaceCurrency } from "@/src/lib/currency";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";

const createTransferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive().refine(Number.isFinite, "Invalid amount"),
  date: z.string().refine((value) => isYmd(value) || !Number.isNaN(new Date(value).getTime()), "Invalid date"),
  merchantId: z.string().nullable().optional(),
  note: z.string().trim().min(1).nullable().optional(),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const fromAccountId = parseObjectId(parsed.data.fromAccountId);
  const toAccountId = parseObjectId(parsed.data.toAccountId);
  if (!fromAccountId || !toAccountId) {
    return errorResponse("Invalid account id", 400);
  }
  if (fromAccountId.equals(toAccountId)) {
    return errorResponse("From and to account must be different", 400);
  }

  const [fromAccount, toAccount] = await Promise.all([
    AccountModel.findOne({ _id: fromAccountId, workspaceId: auth.workspace.id, isArchived: false }).lean(),
    AccountModel.findOne({ _id: toAccountId, workspaceId: auth.workspace.id, isArchived: false }).lean(),
  ]);

  if (!fromAccount || !toAccount) {
    return errorResponse("Account not found", 404);
  }

  const transferId = new mongoose.Types.ObjectId();
  const amountMinor = toMinorUnits(parsed.data.amount);
  const currency = getWorkspaceCurrency(auth.workspace);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await TransactionModel.create(
        [
          {
            workspaceId: auth.workspace.id,
            accountId: fromAccountId,
            transferAccountId: toAccountId,
            transferId,
            transferSide: "out",
            categoryId: null,
            amountMinor,
            currency,
            kind: "transfer",
            date: normalizeToUtcMidnight(parsed.data.date),
            merchantId: null,
            merchantNameSnapshot: null,
            note: parsed.data.note ?? undefined,
            receiptUrls: [],
            isArchived: false,
            isPending: false,
          },
          {
            workspaceId: auth.workspace.id,
            accountId: toAccountId,
            transferAccountId: fromAccountId,
            transferId,
            transferSide: "in",
            categoryId: null,
            amountMinor,
            currency,
            kind: "transfer",
            date: normalizeToUtcMidnight(parsed.data.date),
            merchantId: null,
            merchantNameSnapshot: null,
            note: parsed.data.note ?? undefined,
            receiptUrls: [],
            isArchived: false,
            isPending: false,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return NextResponse.json({ data: { transferId: transferId.toString() } });
}
