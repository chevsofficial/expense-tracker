import { NextResponse } from "next/server";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
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
    const [categories, groups] = await Promise.all([
      CategoryModel.find({ workspaceId: auth.workspace.id }).sort({ nameKey: 1 }).lean(),
      CategoryGroupModel.find({ workspaceId: auth.workspace.id }).lean(),
    ]);
    const groupMap = new Map(
      groups.map((group) => [group._id.toString(), group.nameCustom ?? group.nameKey])
    );

    const headers = ["name", "group", "kind", "isArchived"];
    const rows = categories.map((category) => [
      category.nameCustom ?? category.nameKey,
      category.groupId ? groupMap.get(category.groupId.toString()) ?? "" : "",
      category.kind ?? "",
      category.isArchived ? "true" : "false",
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="categories.csv"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export categories";
    return errorResponse(message, 500);
  }
}
