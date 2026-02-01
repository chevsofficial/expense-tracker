import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["archive", "restore", "deleteHard"]),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const objectIds = parsed.data.ids
    .map((id) => parseObjectId(id))
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  if (objectIds.length !== parsed.data.ids.length) {
    return errorResponse("Invalid transaction id", 400);
  }

  const existing = await TransactionModel.countDocuments({
    _id: { $in: objectIds },
    workspaceId: auth.workspace.id,
  });
  if (existing !== objectIds.length) {
    return errorResponse("Some transactions were not found", 404);
  }

  if (parsed.data.action === "deleteHard") {
    await TransactionModel.deleteMany({ _id: { $in: objectIds }, workspaceId: auth.workspace.id });
    return NextResponse.json({ data: { deleted: objectIds.length } });
  }

  const isArchived = parsed.data.action === "archive";
  await TransactionModel.updateMany(
    { _id: { $in: objectIds }, workspaceId: auth.workspace.id },
    { $set: { isArchived } }
  );

  return NextResponse.json({ data: { updated: objectIds.length } });
}
