import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/server/auth";
import { dbConnect } from "@/src/db/mongoose";
import { UserModel, type UserDoc } from "@/src/models/User";
import { WorkspaceModel, type WorkspaceDoc } from "@/src/models/Workspace";

type AuthContext = {
  user: UserDoc & { _id: mongoose.Types.ObjectId; save: () => Promise<unknown> };
  workspace: WorkspaceDoc;
};

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function requireAuthContext(): Promise<AuthContext | { response: NextResponse }> {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const tokenUserId = typeof (session as { sub?: string } | null)?.sub === "string" ? (session as { sub?: string }).sub : null;
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email && !sessionUserId && !tokenUserId) {
    return { response: errorResponse("Unauthorized", 401) };
  }

  const userId = sessionUserId ?? tokenUserId;
  const user = userId ? await UserModel.findById(userId) : await UserModel.findOne({ email });
  if (!user) {
    return { response: errorResponse("Unauthorized", 401) };
  }

  const workspace = await WorkspaceModel.findOne({ userId: user._id }).sort({ createdAt: 1 });
  if (!workspace) {
    return { response: errorResponse("Workspace not found", 404) };
  }

  return { user, workspace };
}

export function parseObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}
