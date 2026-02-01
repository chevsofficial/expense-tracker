import { NextResponse } from "next/server";
import { MerchantModel } from "@/src/models/Merchant";
import { CategoryModel } from "@/src/models/Category";
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
    const [merchants, categories] = await Promise.all([
      MerchantModel.find({ workspaceId: auth.workspace.id }).sort({ nameKey: 1 }).lean(),
      CategoryModel.find({ workspaceId: auth.workspace.id }).lean(),
    ]);
    const categoryMap = new Map(
      categories.map((category) => [category._id.toString(), category.nameCustom ?? category.nameKey])
    );

    const headers = ["name", "defaultCategory", "defaultKind", "aliases"];
    const rows = merchants.map((merchant) => [
      merchant.name,
      merchant.defaultCategoryId
        ? categoryMap.get(merchant.defaultCategoryId.toString()) ?? ""
        : "",
      merchant.defaultKind ?? "",
      merchant.aliases?.join("|") ?? "",
    ]);

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
