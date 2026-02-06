import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AccountModel } from "@/src/models/Account";
import { requireAuthContext, errorResponse, parseObjectId } from "@/src/server/api";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: z.enum(["cash", "bank", "investment", "credit", "other"]).nullable().optional(),
    currency: z.string().trim().min(1).nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
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
    return errorResponse("Invalid account id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const update = {
    ...parsed.data,
  };

  const account = await AccountModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: update },
    { new: true }
  );

  if (!account) {
    return errorResponse("Account not found", 404);
  }

  return NextResponse.json({ data: account });
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
    return errorResponse("Invalid account id", 400);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    await AccountModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });
    return NextResponse.json({ data: { deleted: true } });
  }

  const account = await AccountModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: { isArchived: true } },
    { new: true }
  );

  if (!account) {
    return errorResponse("Account not found", 404);
  }

  return NextResponse.json({ data: account });
}
