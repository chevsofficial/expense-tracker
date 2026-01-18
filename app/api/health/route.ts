import { NextResponse } from "next/server";
import { dbConnect } from "@/src/db/mongoose";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
