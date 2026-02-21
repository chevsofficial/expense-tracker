import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { clientPromise } from "@/src/db/mongodbClient";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { UserModel } from "@/src/models/User";

const payloadSchema = z.object({
  email: z.string().email().min(3),
});

export async function PUT(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const existingUser = await UserModel.findOne({
    _id: { $ne: auth.user._id },
    email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });

  if (existingUser) {
    return errorResponse("Email is already in use", 409);
  }

  auth.user.email = normalizedEmail;
  await auth.user.save();

  const client = await clientPromise;
  await client.db().collection("users").updateOne(
    { _id: auth.user._id },
    { $set: { email: normalizedEmail, emailVerified: null, updatedAt: new Date() } }
  );

  return NextResponse.json({
    data: {
      email: normalizedEmail,
    },
  });
}
