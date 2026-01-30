import { NextResponse, type NextRequest } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { errorResponse, requireAuthContext } from "@/src/server/api";

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return errorResponse("Invalid upload", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("File is required", 400);
  }

  const filename = `${Date.now()}-${file.name || "receipt"}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "receipts", auth.workspace.id);
  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);
  const url = `/uploads/receipts/${auth.workspace.id}/${filename}`;

  return NextResponse.json({ data: { url } });
}
