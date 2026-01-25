import NextAuth, { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { clientPromise } from "@/src/db/mongodbClient";
import { dbConnect } from "@/src/db/mongoose";
import { UserModel } from "@/src/models/User";
import { ensureWorkspaceSeeded } from "@/src/server/seed";

const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        const from = process.env.EMAIL_FROM;
        if (!from) throw new Error("Missing EMAIL_FROM");
        if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

        await resend.emails.send({
          from,
          to: identifier,
          subject: "Sign in to Spendary",
          html: `
            <div style="font-family: Arial, sans-serif; line-height:1.5">
              <h2>Sign in</h2>
              <p>Click the button below to sign in. If you didn’t request this, you can ignore this email.</p>
              <p style="margin: 24px 0;">
                <a href="${url}" style="background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
                  Sign in
                </a>
              </p>
              <p style="color:#6b7280;font-size:12px;">This link will expire.</p>
            </div>
          `,
        });
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;

      await dbConnect();

      const existing = await UserModel.findOne({ email: user.email });
      if (!existing) {
        await UserModel.create({
          email: user.email,
          name: user.name || "",
          plan: "free",
        });
      }

      const dbUser = await UserModel.findOne({ email: user.email });
      if (dbUser) {
        await ensureWorkspaceSeeded(dbUser._id.toString());
      }

      return true;
    },
  },
} satisfies NextAuthOptions;

// Optional helper if you ever want it:
export const nextAuthHandler = NextAuth(authOptions);
