import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AccountModel } from "@/src/models/Account";
import { requireAuthContext, errorResponse } from "@/src/server/api";

const createSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["cash", "bank", "investment", "credit", "other"]).optional(),
  currency: z.string().trim().min(1).nullable().optional(),
});

const DEFAULT_ACCOUNTS = [
  { name: "Cash Wallet", type: "cash" as const },
  { name: "Bank Account", type: "bank" as const },
  { name: "Investment Account", type: "investment" as const },
];

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";

  const existingCount = await AccountModel.countDocuments({ workspaceId: auth.workspace.id });
  if (existingCount === 0) {
    await AccountModel.insertMany(
      DEFAULT_ACCOUNTS.map((account) => ({
        workspaceId: auth.workspace.id,
        name: account.name,
        type: account.type,
        currency: null,
        isArchived: false,
      }))
    );
  }

  const accounts = await AccountModel.find({
    workspaceId: auth.workspace.id,
    ...(includeArchived ? {} : { isArchived: false }),
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ data: accounts });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const account = await AccountModel.create({
    workspaceId: auth.workspace.id,
    name: parsed.data.name.trim(),
    type: parsed.data.type ?? null,
    currency: parsed.data.currency ?? null,
    isArchived: false,
  });

  return NextResponse.json({ data: account });
}
