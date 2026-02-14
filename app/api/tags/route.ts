import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TagModel } from "@/src/models/Tag";
import { errorResponse, requireAuthContext } from "@/src/server/api";

const createSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

  const filter: Record<string, unknown> = {
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { archivedAt: null }),
  };

  const tags = await TagModel.find(filter).sort({ nameNormalized: 1 }).lean();
  return NextResponse.json({ data: tags });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  try {
    const tag = await TagModel.create({
      workspaceId: auth.workspace.id,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      archivedAt: null,
    });
    return NextResponse.json({ data: tag });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("Tag already exists.", 400);
    }
    const message = error instanceof Error ? error.message : "Unable to create tag";
    return errorResponse(message, 500);
  }
}
