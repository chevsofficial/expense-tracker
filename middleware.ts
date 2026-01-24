import { auth } from "@/src/server/auth";
import type { NextRequest } from "next/server";

type AuthedRequest = NextRequest & { auth?: unknown };

export default auth((req: AuthedRequest) => {
  const { nextUrl } = req;

  // If not authenticated and trying to access /app, redirect to /login
  if (!req.auth && nextUrl.pathname.startsWith("/app")) {
    return Response.redirect(new URL("/login", nextUrl.origin));
  }

  return;
});

export const config = {
  matcher: ["/app/:path*"],
};
