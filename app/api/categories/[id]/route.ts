import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { requireAuthContext, errorResponse, parseObjectId } from "@/src/server/api";

const updateSchema = z
  .object({
    nameCustom: z.string().trim().min(1).optional(),
    groupId: z.string().min(1).optional(),
    kind: z.enum(["income", "expense", "both"]).optional(),
    sortOrder: z.number().int().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid category id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const updateData = { ...parsed.data } as {
    nameCustom?: string;
    groupId?: mongoose.Types.ObjectId;
    kind?: "income" | "expense" | "both";
    sortOrder?: number;
    isArchived?: boolean;
  };

  if (parsed.data.groupId) {
    const newGroupId = parseObjectId(parsed.data.groupId);
    if (!newGroupId) {
      return errorResponse("Invalid group id", 400);
    }

    const group = await CategoryGroupModel.findOne({
      _id: newGroupId,
      workspaceId: auth.workspace._id,
    });

    if (!group) {
      return errorResponse("Group not found", 404);
    }

    updateData.groupId = newGroupId;
  }

  const category = await CategoryModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace._id },
    { $set: updateData },
    { new: true }
  );

  if (!category) {
    return errorResponse("Category not found", 404);
  }

  return NextResponse.json({ data: category });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid category id", 400);
  }

  const category = await CategoryModel.findOne({
    _id: objectId,
    workspaceId: auth.workspace._id,
  });

  if (!category) {
    return errorResponse("Category not found", 404);
  }

  category.isArchived = true;
  await category.save();

  return NextResponse.json({ data: category });
}
