import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { requireAuthContext, errorResponse } from "@/src/server/api";

const createSchema = z.object({
  nameCustom: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

  const groups = await CategoryGroupModel.find({
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { isArchived: false }),
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  return NextResponse.json({ data: groups });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const group = await CategoryGroupModel.create({
    workspaceId: auth.workspace.id,
    nameCustom: parsed.data.nameCustom,
    sortOrder: parsed.data.sortOrder ?? 0,
    isDefault: false,
    isArchived: false,
  });

  return NextResponse.json({ data: group });
}
