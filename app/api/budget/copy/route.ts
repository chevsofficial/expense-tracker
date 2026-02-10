import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BudgetMonthModel } from "@/src/models/BudgetMonth";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { parseMonth } from "@/src/server/month";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month");

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const fromParsed = fromParam ? monthSchema.safeParse(fromParam) : null;
  const toParsed = toParam ? monthSchema.safeParse(toParam) : null;

  if (!fromParsed?.success || !toParsed?.success) {
    return errorResponse("Invalid month", 400);
  }

  if (!parseMonth(fromParsed.data) || !parseMonth(toParsed.data)) {
    return errorResponse("Invalid month", 400);
  }

  const source = await BudgetMonthModel.findOne({
    workspaceId: auth.workspace.id,
    month: fromParsed.data,
  });

  const plannedLines = source?.plannedLines ?? [];
  const currency = auth.workspace.defaultCurrency;

  const budget = await BudgetMonthModel.findOneAndUpdate(
    { workspaceId: auth.workspace.id, month: toParsed.data },
    {
      $set: {
        currency,
        plannedLines,
      },
    },
    { new: true, upsert: true }
  );

  return NextResponse.json({ data: budget });
}
