import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AccountModel } from "@/src/models/Account";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";
import { isYmd, normalizeToUtcMidnight } from "@/src/utils/dateOnly";

const updateTransferSchema = z.object({
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  amount: z.number().positive().refine(Number.isFinite, "Invalid amount").optional(),
  date: z.string().refine((value) => isYmd(value) || !Number.isNaN(new Date(value).getTime()), "Invalid date").optional(),
  note: z.string().trim().min(1).nullable().optional(),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const transferObjectId = parseObjectId(id);
  if (!transferObjectId) {
    return errorResponse("Invalid transfer id", 400);
  }

  const legs = await TransactionModel.find({
    workspaceId: auth.workspace.id,
    kind: "transfer",
    transferId: transferObjectId,
  }).lean();

  if (legs.length !== 2) {
    return errorResponse("Transfer not found", 404);
  }

  return NextResponse.json({ data: { transferId: id, legs } });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const transferObjectId = parseObjectId(id);
  if (!transferObjectId) {
    return errorResponse("Invalid transfer id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTransferSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }
  if (Object.keys(parsed.data).length === 0) {
    return errorResponse("No updates provided", 400);
  }

  const legs = await TransactionModel.find({
    workspaceId: auth.workspace.id,
    kind: "transfer",
    transferId: transferObjectId,
  });
  if (legs.length !== 2) {
    return errorResponse("Transfer not found", 404);
  }

  const outLeg = legs.find((item) => item.transferSide === "out");
  const inLeg = legs.find((item) => item.transferSide === "in");
  if (!outLeg || !inLeg) {
    return errorResponse("Transfer is invalid", 400);
  }

  let nextFromAccountId = outLeg.accountId;
  let nextToAccountId = inLeg.accountId;

  if (parsed.data.fromAccountId) {
    const parsedId = parseObjectId(parsed.data.fromAccountId);
    if (!parsedId) return errorResponse("Invalid from account id", 400);
    const account = await AccountModel.findOne({ _id: parsedId, workspaceId: auth.workspace.id, isArchived: false }).lean();
    if (!account) return errorResponse("From account not found", 404);
    nextFromAccountId = parsedId;
  }

  if (parsed.data.toAccountId) {
    const parsedId = parseObjectId(parsed.data.toAccountId);
    if (!parsedId) return errorResponse("Invalid to account id", 400);
    const account = await AccountModel.findOne({ _id: parsedId, workspaceId: auth.workspace.id, isArchived: false }).lean();
    if (!account) return errorResponse("To account not found", 404);
    nextToAccountId = parsedId;
  }

  if (!nextFromAccountId || !nextToAccountId || nextFromAccountId.equals(nextToAccountId)) {
    return errorResponse("From and to account must be different", 400);
  }

  const sharedUpdate: Record<string, unknown> = {};
  if (parsed.data.amount !== undefined) sharedUpdate.amountMinor = toMinorUnits(parsed.data.amount);
  if (parsed.data.date !== undefined) sharedUpdate.date = normalizeToUtcMidnight(parsed.data.date);
  if (parsed.data.note !== undefined) sharedUpdate.note = parsed.data.note ?? undefined;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await TransactionModel.updateOne(
        { _id: outLeg._id, workspaceId: auth.workspace.id },
        { ...sharedUpdate, accountId: nextFromAccountId, transferAccountId: nextToAccountId },
        { session }
      );
      await TransactionModel.updateOne(
        { _id: inLeg._id, workspaceId: auth.workspace.id },
        { ...sharedUpdate, accountId: nextToAccountId, transferAccountId: nextFromAccountId },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  const updatedLegs = await TransactionModel.find({
    workspaceId: auth.workspace.id,
    kind: "transfer",
    transferId: transferObjectId,
  }).lean();

  return NextResponse.json({ data: { transferId: id, legs: updatedLegs } });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const transferObjectId = parseObjectId(id);
  if (!transferObjectId) {
    return errorResponse("Invalid transfer id", 400);
  }

  const deleted = await TransactionModel.deleteMany({
    workspaceId: auth.workspace.id,
    kind: "transfer",
    transferId: transferObjectId,
  });

  if (!deleted.deletedCount) {
    return errorResponse("Transfer not found", 404);
  }

  return NextResponse.json({ data: { deleted: true } });
}
