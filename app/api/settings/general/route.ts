import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/src/constants/currencies";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { getWorkspaceCurrency } from "@/src/lib/currency";

const payloadSchema = z.object({
  defaultCurrency: z.enum(SUPPORTED_CURRENCIES),
});

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    data: {
      defaultCurrency: getWorkspaceCurrency(auth.workspace),
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  auth.workspace.defaultCurrency = parsed.data.defaultCurrency;
  await auth.workspace.save();

  return NextResponse.json({
    data: {
      defaultCurrency: auth.workspace.defaultCurrency,
    },
  });
}
