import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BudgetModel } from "@/src/models/Budget";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const pinSchema = z.object({
  pinned: z.boolean(),
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
    return errorResponse("Invalid budget id", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = pinSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const budget = await BudgetModel.findOneAndUpdate(
    { _id: objectId, workspaceId: auth.workspace.id },
    { $set: { pinnedAt: parsed.data.pinned ? new Date() : null } },
    { new: true }
  );

  if (!budget) {
    return errorResponse("Budget not found", 404);
  }

  return NextResponse.json({ data: budget });
}
