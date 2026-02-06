import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { currentMonth } from "@/src/server/month";
import { getBudgetSummary } from "@/src/server/budget/getBudgetSummary";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

export async function GET(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const monthParam = params.get("month") ?? currentMonth();
  const parsedMonth = monthSchema.safeParse(monthParam);
  if (!parsedMonth.success) {
    return errorResponse("Invalid month", 400);
  }

  const includeArchivedCategories = params.get("includeArchivedCategories") === "true";
  const includePending = params.get("includePending") !== "false";
  const summary = await getBudgetSummary({
    workspace: auth.workspace,
    month: parsedMonth.data,
    includeArchivedCategories,
    includePending,
  });

  return NextResponse.json({
    data: {
      month: summary.month,
      currencies: summary.currencies,
    },
  });
}
