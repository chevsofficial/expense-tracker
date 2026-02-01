import { NextResponse } from "next/server";
import { MerchantModel } from "@/src/models/Merchant";
import { errorResponse, requireAuthContext } from "@/src/server/api";

const csvEscape = (value: string) => {
  const normalized = value ?? "";
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  try {
    const merchants = await MerchantModel.find({ workspaceId: auth.workspace.id })
      .sort({ nameKey: 1 })
      .lean();

    const headers = ["name", "aliases"];
    const rows = merchants.map((merchant) => [merchant.name, merchant.aliases?.join("|") ?? ""]);

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="merchants.csv"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export merchants";
    return errorResponse(message, 500);
  }
}
