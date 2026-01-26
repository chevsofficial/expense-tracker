import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { TransactionModel } from "@/src/models/Transaction";
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

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = context.params;

  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid category id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.groupId) {
    const newGroupId = parseObjectId(parsed.data.groupId);
    if (!newGroupId) {
      return errorResponse("Invalid group id", 400);
    }

    const group = await CategoryGroupModel.findOne({
      _id: newGroupId,
      workspaceId: auth.workspace.id,
    });

    if (!group) {
      return errorResponse("Group not found", 404);
    }

    updateData.groupId = newGroupId;
  }

  const category = await CategoryModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: updateData },
    { new: true }
  );

  if (!category) {
    return errorResponse("Category not found", 404);
  }

  return NextResponse.json({ data: category });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = context.params;

  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid category id", 400);
  }

  const category = await CategoryModel.findOne({
    _id: objectId,
    workspaceId: auth.workspace.id,
  });

  if (!category) {
    return errorResponse("Category not found", 404);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";

  if (hardDelete) {
    const [transactionCount, budgetCount] = await Promise.all([
      TransactionModel.countDocuments({
        workspaceId: auth.workspace.id,
        categoryId: objectId,
      }),
      BudgetMonthModel.countDocuments({
        workspaceId: auth.workspace.id,
        "plannedLines.categoryId": objectId,
      }),
    ]);

    if (transactionCount > 0 || budgetCount > 0) {
      return errorResponse(
        "Cannot permanently delete: category is referenced by historical data. Archive instead.",
        400
      );
    }

    await CategoryModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });

    return NextResponse.json({ data: { deleted: true } });
  }

  category.isArchived = true;
  await category.save();

  return NextResponse.json({ data: category });
}
