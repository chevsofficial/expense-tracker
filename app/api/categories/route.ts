import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { requireAuthContext, errorResponse, parseObjectId } from "@/src/server/api";

const createSchema = z.object({
  groupId: z.string().min(1),
  nameCustom: z.string().trim().min(1),
  kind: z.enum(["income", "expense"]).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const groupIdParam = request.nextUrl.searchParams.get("groupId");
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const groupId = groupIdParam ? parseObjectId(groupIdParam) : null;

  if (groupIdParam && !groupId) {
    return errorResponse("Invalid group id", 400);
  }

  const categories = await CategoryModel.find({
    workspaceId: auth.workspace.id,
    ...(groupId ? { groupId } : {}),
    ...(includeArchived ? {} : { isArchived: false }),
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  return NextResponse.json({ data: categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const groupId = parseObjectId(parsed.data.groupId);
  if (!groupId) {
    return errorResponse("Invalid group id", 400);
  }

  const group = await CategoryGroupModel.findOne({
    _id: groupId,
    workspaceId: auth.workspace.id,
  });

  if (!group) {
    return errorResponse("Group not found", 404);
  }

  const category = await CategoryModel.create({
    workspaceId: auth.workspace.id,
    groupId,
    nameCustom: parsed.data.nameCustom,
    kind: parsed.data.kind ?? "expense",
    sortOrder: parsed.data.sortOrder ?? 0,
    isDefault: false,
    isArchived: false,
  });

  return NextResponse.json({ data: category });
}
