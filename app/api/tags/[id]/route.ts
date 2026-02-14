import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TagModel } from "@/src/models/Tag";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    color: z.string().trim().min(1).nullable().optional(),
    archivedAt: z.string().datetime().nullable().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one update is required",
  });

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid tag id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name;
  if (parsed.data.color !== undefined) updatePayload.color = parsed.data.color;
  if (parsed.data.archivedAt !== undefined) {
    updatePayload.archivedAt = parsed.data.archivedAt ? new Date(parsed.data.archivedAt) : null;
  }
  if (typeof parsed.data.isArchived === "boolean") {
    updatePayload.archivedAt = parsed.data.isArchived ? new Date() : null;
  }

  try {
    const tag = await TagModel.findOneAndUpdate(
      { _id: objectId, workspaceId: auth.workspace.id },
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!tag) return errorResponse("Tag not found", 404);
    return NextResponse.json({ data: tag });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("Tag already exists.", 400);
    }
    const message = error instanceof Error ? error.message : "Unable to update tag";
    return errorResponse(message, 500);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid tag id", 400);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";
  if (!hardDelete) {
    const tag = await TagModel.findOneAndUpdate(
      { _id: objectId, workspaceId: auth.workspace.id },
      { $set: { archivedAt: new Date() } },
      { new: true }
    );
    if (!tag) return errorResponse("Tag not found", 404);
    return NextResponse.json({ data: tag });
  }

  const tag = await TagModel.findOne({ _id: objectId, workspaceId: auth.workspace.id });
  if (!tag) return errorResponse("Tag not found", 404);

  await TransactionModel.updateMany(
    { workspaceId: auth.workspace.id, tagIds: objectId },
    { $pull: { tagIds: objectId } }
  );
  await TagModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });

  return NextResponse.json({ data: { deleted: true } });
}
