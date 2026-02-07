import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { CategoryModel } from "@/src/models/Category";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { BudgetModel } from "@/src/models/Budget";
import { TransactionModel } from "@/src/models/Transaction";
import { requireAuthContext, errorResponse, parseObjectId } from "@/src/server/api";

const logError = (message: string, details: Record<string, unknown>) => {
  console.error("Category groups API error:", { message, ...details });
};

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
    logError("Invalid group id", { workspaceId: auth.workspace.id, groupId: id });
    return errorResponse("Invalid group id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    logError(parsed.error.message, { workspaceId: auth.workspace.id, groupId: id });
    return errorResponse(parsed.error.message, 400);
  }

  const group = await CategoryGroupModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: parsed.data },
    { new: true }
  );

  if (!group) {
    logError("Group not found", { workspaceId: auth.workspace.id, groupId: id });
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
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const objectId = parseObjectId(id);
  if (!objectId) {
    logError("Invalid group id", { workspaceId: auth.workspace.id, groupId: id, query });
    return errorResponse("Invalid group id", 400);
  }

  const group = await CategoryGroupModel.findOne({ _id: objectId, workspaceId: auth.workspace.id });
  if (!group) {
    logError("Group not found", { workspaceId: auth.workspace.id, groupId: id, query });
    return errorResponse("Group not found", 404);
  }

  const hardDelete = request.nextUrl.searchParams.get("hard") === "1";
  const cascadeDelete = request.nextUrl.searchParams.get("cascade") === "1";

  if (hardDelete) {
    if (cascadeDelete) {
      const categories = await CategoryModel.find(
        { workspaceId: auth.workspace.id, groupId: objectId },
        { _id: 1 }
      ).lean();
      const categoryIds = categories.map((category) => category._id);

      if (categoryIds.length > 0) {
        const [transactionCount, budgetMonthCount, budgetCount] = await Promise.all([
          TransactionModel.countDocuments({
            workspaceId: auth.workspace.id,
            categoryId: { $in: categoryIds },
          }),
          BudgetMonthModel.countDocuments({
            workspaceId: auth.workspace.id,
            "plannedLines.categoryId": { $in: categoryIds },
          }),
          BudgetModel.countDocuments({
            workspaceId: auth.workspace.id,
            categoryIds: { $in: categoryIds },
          }),
        ]);

        const totalBudgetCount = budgetMonthCount + budgetCount;
        if (transactionCount > 0 || totalBudgetCount > 0) {
          const message =
            "Cannot permanently delete group: some categories are referenced by historical data. Archive instead.";
          logError(message, {
            workspaceId: auth.workspace.id,
            groupId: id,
            query,
            transactionCount,
            budgetCount: totalBudgetCount,
          });
          return errorResponse(message, 400);
        }

        await CategoryModel.deleteMany({
          workspaceId: auth.workspace.id,
          groupId: objectId,
        });
      }

      await CategoryGroupModel.deleteOne({ _id: objectId, workspaceId: auth.workspace.id });
      return NextResponse.json({ data: { deleted: true } });
    }

    const categoryCount = await CategoryModel.countDocuments({
      workspaceId: auth.workspace.id,
      groupId: objectId,
    });

    if (categoryCount > 0) {
      const message =
        "Cannot permanently delete group: it still has categories (including archived). Archive instead, or permanently delete/move categories first.";
      logError(message, {
        workspaceId: auth.workspace.id,
        groupId: id,
        query,
        categoryCount,
      });
      return errorResponse(message, 400);
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
