import { NextResponse } from "next/server";
import { z } from "zod";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { errorResponse, parseObjectId, requireAuthContext } from "@/src/server/api";

const bulkSchema = z.object({
  action: z.enum(["archive", "unarchive", "delete"]),
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const objectIds = parsed.data.ids.map(parseObjectId);
  if (objectIds.some((id) => !id)) return errorResponse("Invalid group ids", 400);
  const ids = objectIds.filter((id) => id !== null);

  if (parsed.data.action === "delete") {
    const result = await CategoryGroupModel.deleteMany({ workspaceId: auth.workspace.id, _id: { $in: ids } });
    return NextResponse.json({ data: { deleted: result.deletedCount } });
  }

  const result = await CategoryGroupModel.updateMany(
    { workspaceId: auth.workspace.id, _id: { $in: ids } },
    { $set: { isArchived: parsed.data.action === "archive" } }
  );
  return NextResponse.json({ data: { updated: result.modifiedCount } });
}
