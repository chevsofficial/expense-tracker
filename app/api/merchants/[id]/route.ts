import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  isArchived: z.boolean().optional(),
});

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

  if (Object.keys(parsed.data).length === 0) {
    return errorResponse("No updates provided", 400);
  }

  try {
    const merchant = await MerchantModel.findOneAndUpdate(
      { _id: objectId, workspaceId: auth.workspace.id },
      parsed.data,
      { new: true, runValidators: true }
    );

    if (!merchant) {
      return errorResponse("Merchant not found", 404);
    }

    return NextResponse.json({ data: merchant });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("Merchant already exists.", 409);
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
