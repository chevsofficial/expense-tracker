import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { TransactionModel } from "@/src/models/Transaction";
import { requireAuthContext, errorResponse, parseObjectId } from "@/src/server/api";

const logError = (message: string, details: Record<string, unknown>) => {
  console.error("Categories API error:", { message, ...details });
};

const updateSchema = z
  .object({
    nameCustom: z.string().trim().min(1).optional(),
    emoji: z.string().trim().max(8).nullable().optional(),
    groupId: z.string().min(1).optional(),
    kind: z.enum(["income", "expense"]).optional(),
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
    logError("Invalid category id", { workspaceId: auth.workspace.id, categoryId: id });
    return errorResponse("Invalid category id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    logError(parsed.error.message, { workspaceId: auth.workspace.id, categoryId: id });
    return errorResponse(parsed.error.message, 400);
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.groupId) {
    const newGroupId = parseObjectId(parsed.data.groupId);
    if (!newGroupId) {
      logError("Invalid group id", {
        workspaceId: auth.workspace.id,
        categoryId: id,
        groupId: parsed.data.groupId,
      });
      return errorResponse("Invalid group id", 400);
    }

    const group = await CategoryGroupModel.findOne({
      _id: newGroupId,
      workspaceId: auth.workspace.id,
    });

    if (!group) {
      logError("Group not found", { workspaceId: auth.workspace.id, categoryId: id });
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
    logError("Category not found", { workspaceId: auth.workspace.id, categoryId: id });
    return errorResponse("Category not found", 404);
  }

  return NextResponse.json({ data: category });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const objectId = parseObjectId(id);
  if (!objectId) {
    logError("Invalid category id", { workspaceId: auth.workspace.id, categoryId: id, query });
    return errorResponse("Invalid category id", 400);
  }

  const category = await CategoryModel.findOne({
    _id: objectId,
    workspaceId: auth.workspace.id,
  });

  if (!category) {
    logError("Category not found", { workspaceId: auth.workspace.id, categoryId: id, query });
    return errorResponse("Category not found", 404);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";
  const forceDelete = request.nextUrl.searchParams.get("force") === "1";

  if (hardDelete) {
    const transactionCount = await TransactionModel.countDocuments({
      workspaceId: auth.workspace.id,
      categoryId: objectId,
    });

    if (transactionCount > 0 && !forceDelete) {
      const message = `Category is in use: referenced by ${transactionCount} transactions.`;
      logError(message, {
        workspaceId: auth.workspace.id,
        categoryId: id,
        query,
        transactionCount,
      });

      return NextResponse.json(
        {
          ok: false,
          code: "CATEGORY_HAS_REFERENCES",
          message,
          references: {
            transactionCount,
          },
        },
        { status: 409 }
      );
    }

    let transactionsUpdatedCount = 0;
    try {
      const transactionsUpdated = await TransactionModel.updateMany(
        { workspaceId: auth.workspace.id, categoryId: objectId },
        { $set: { categoryId: null } }
      );
      transactionsUpdatedCount = transactionsUpdated.modifiedCount;
    } catch (error) {
      logError("Failed tx cleanup", {
        workspaceId: auth.workspace.id,
        categoryId: id,
        hardDelete,
        forceDelete,
        query,
        error,
      });
      throw error;
    }

    await CategoryModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });

    return NextResponse.json({
      data: {
        deleted: true,
        forced: forceDelete,
        changes: {
          transactionsUpdated: transactionsUpdatedCount,
        },
      },
    });
  }

  category.isArchived = true;
  await category.save();

  return NextResponse.json({ data: category });
}
