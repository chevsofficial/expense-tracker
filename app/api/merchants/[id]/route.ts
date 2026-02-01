import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MerchantModel } from "@/src/models/Merchant";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const updateSchema = z
  .object({
    nameCustom: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    aliases: z.array(z.string()).optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one update is required",
  });

const normalizeAliases = (aliases: string[] | undefined) => {
  if (!aliases) return [];
  const normalized = aliases
    .map((alias) => alias.trim().toLowerCase())
    .filter((alias) => alias.length > 0);
  return Array.from(new Set(normalized));
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
    return errorResponse("Invalid merchant id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.nameCustom ?? parsed.data.name) {
    updatePayload.name = parsed.data.nameCustom ?? parsed.data.name;
  }
  if (parsed.data.aliases !== undefined) {
    updatePayload.aliases = normalizeAliases(parsed.data.aliases);
  }
  if (typeof parsed.data.isArchived === "boolean") {
    updatePayload.isArchived = parsed.data.isArchived;
  }

  if (Object.keys(updatePayload).length === 0) {
    return errorResponse("No updates provided", 400);
  }

  try {
    const merchant = await MerchantModel.findOneAndUpdate(
      { _id: objectId, workspaceId: auth.workspace.id },
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!merchant) {
      return errorResponse("Merchant not found", 404);
    }

    return NextResponse.json({ data: merchant });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("Merchant already exists.", 400);
    }
    const message = error instanceof Error ? error.message : "Unable to update merchant";
    return errorResponse(message, 500);
  }
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
    return errorResponse("Invalid merchant id", 400);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    const merchant = await MerchantModel.findOne({
      _id: objectId,
      workspaceId: auth.workspace.id,
    });
    if (!merchant) {
      return errorResponse("Merchant not found", 404);
    }
    const referenceCount = await TransactionModel.countDocuments({
      workspaceId: auth.workspace.id,
      merchantId: objectId,
    });
    if (referenceCount > 0) {
      return errorResponse("Cannot delete merchant while transactions reference it.", 400);
    }
    await MerchantModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });
    return NextResponse.json({ data: { deleted: true } });
  }

  const merchant = await MerchantModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { isArchived: true },
    { new: true }
  );

  if (!merchant) {
    return errorResponse("Merchant not found", 404);
  }

  return NextResponse.json({ data: merchant });
}
