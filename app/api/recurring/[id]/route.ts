import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { RecurringModel } from "@/src/models/Recurring";
import { CategoryModel } from "@/src/models/Category";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const scheduleSchema = z
  .object({
    cadence: z.literal("monthly"),
    dayOfMonth: z.number().int().min(1).max(31),
  })
  .optional();

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().trim().min(1).optional(),
  kind: z.enum(["expense", "income"]).optional(),
  categoryId: z.string().nullable().optional(),
  schedule: scheduleSchema,
  isActive: z.boolean().optional(),
});

const toMinorUnits = (amount: number) => Math.round(amount * 100);

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const objectId = parseObjectId(id);
  if (!objectId) {
    return errorResponse("Invalid recurring id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.amount !== undefined) update.amountMinor = toMinorUnits(parsed.data.amount);
  if (parsed.data.currency !== undefined) update.currency = parsed.data.currency;
  if (parsed.data.kind !== undefined) update.kind = parsed.data.kind;
  if (parsed.data.schedule !== undefined) update.schedule = parsed.data.schedule;
  if (parsed.data.isActive !== undefined) update.isActive = parsed.data.isActive;

  if (parsed.data.categoryId !== undefined) {
    if (parsed.data.categoryId === null) {
      update.categoryId = null;
    } else {
      const categoryObjectId = parseObjectId(parsed.data.categoryId);
      if (!categoryObjectId) {
        return errorResponse("Invalid category id", 400);
      }
      const category = await CategoryModel.findOne({
        _id: categoryObjectId,
        workspaceId: auth.workspace.id,
      });
      if (!category) {
        return errorResponse("Category not found", 404);
      }
      update.categoryId = categoryObjectId;
    }
  }

  const recurring = await RecurringModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    update,
    { new: true }
  );

  if (!recurring) {
    return errorResponse("Recurring not found", 404);
  }

  return NextResponse.json({ data: recurring });
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
    return errorResponse("Invalid recurring id", 400);
  }

  const recurring = await RecurringModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { isActive: false },
    { new: true }
  );

  if (!recurring) {
    return errorResponse("Recurring not found", 404);
  }

  return NextResponse.json({ data: recurring });
}
