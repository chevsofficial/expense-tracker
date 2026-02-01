import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { MerchantModel, normalizeMerchantNameKey } from "@/src/models/Merchant";
import { errorResponse, requireAuthContext } from "@/src/server/api";

const createSchema = z
  .object({
    nameCustom: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    aliases: z.array(z.string()).optional(),
  })
  .refine((data) => Boolean(data.nameCustom || data.name), {
    message: "Merchant name is required",
  });

const normalizeAliases = (aliases: string[] | undefined) => {
  if (!aliases) return [];
  const normalized = aliases
    .map((alias) => alias.trim().toLowerCase())
    .filter((alias) => alias.length > 0);
  return Array.from(new Set(normalized));
};

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const query = request.nextUrl.searchParams.get("query");
  const normalizedQuery = query ? normalizeMerchantNameKey(query) : "";

  const filter: Record<string, unknown> = {
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { isArchived: false }),
  };

  if (normalizedQuery) {
    const regexValue = normalizedQuery.replace(/-/g, ".*");
    filter.$or = [
      { nameKey: { $regex: regexValue, $options: "i" } },
      { aliases: { $regex: regexValue, $options: "i" } },
    ];
  }

  const merchants = await MerchantModel.find(filter).sort({ nameKey: 1 }).lean();

  return NextResponse.json({ data: merchants });
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
    const merchant = await MerchantModel.create({
      workspaceId: auth.workspace.id,
      name: parsed.data.nameCustom ?? parsed.data.name ?? "",
      aliases: normalizeAliases(parsed.data.aliases),
      isArchived: false,
    });
    return NextResponse.json({ data: merchant });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return errorResponse("Merchant already exists.", 400);
    }
    const message = error instanceof Error ? error.message : "Unable to create merchant";
    return errorResponse(message, 500);
  }
}
