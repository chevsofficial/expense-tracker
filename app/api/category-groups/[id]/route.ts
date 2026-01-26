import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { CategoryModel } from "@/src/models/Category";
import { requireAuthContext, errorResponse, parseObjectId } from "@/src/server/api";

const updateSchema = z
  .object({
    nameCustom: z.string().trim().min(1).optional(),
    sortOrder: z.number().int().optional(),
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
    return errorResponse("Invalid group id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const group = await CategoryGroupModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: parsed.data },
    { new: true }
  );

  if (!group) {
    return errorResponse("Group not found", 404);
  }

  return NextResponse.json({ data: group });
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
    return errorResponse("Invalid group id", 400);
  }

  const group = await CategoryGroupModel.findOne({ _id: objectId, workspaceId: auth.workspace.id });
  if (!group) {
    return errorResponse("Group not found", 404);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    const categoryCount = await CategoryModel.countDocuments({
      workspaceId: auth.workspace.id,
      groupId: objectId,
    });

    if (categoryCount > 0) {
      return errorResponse(
        "Cannot permanently delete: group still has categories. Archive instead.",
        400
      );
    }

    await CategoryGroupModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });

    return NextResponse.json({ data: { deleted: true } });
  }

  group.isArchived = true;
  await group.save();

  await CategoryModel.updateMany(
    { workspaceId: auth.workspace.id, groupId: objectId },
    { $set: { isArchived: true } }
  );

  return NextResponse.json({ data: group });
}
