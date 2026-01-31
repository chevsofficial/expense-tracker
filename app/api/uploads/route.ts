import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { requireAuthContext } from "@/src/server/api";

export async function PUT(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: { message: "Invalid upload" } }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { message: "File is required" } }, { status: 400 });
  }

  const blob = await put(file.name || "receipt", file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({ data: { url: blob.url } });
}
