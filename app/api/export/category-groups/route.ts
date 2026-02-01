import { NextResponse } from "next/server";
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
    const groups = await CategoryGroupModel.find({ workspaceId: auth.workspace.id })
      .sort({ sortOrder: 1 })
      .lean();

    const headers = ["name", "sortOrder", "isArchived"];
    const rows = groups.map((group) => [
      group.nameCustom ?? group.nameKey,
      String(group.sortOrder ?? 0),
      group.isArchived ? "true" : "false",
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="category-groups.csv"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export category groups";
    return errorResponse(message, 500);
  }
}
