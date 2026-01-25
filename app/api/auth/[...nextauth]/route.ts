import NextAuth from "next-auth";
import { authOptions } from "@/src/server/auth";

console.log("PROD AUTH adapter exists?", Boolean(authOptions?.adapter));
console.log("PROD AUTH has MONGODB_URI?", Boolean(process.env.MONGODB_URI));
console.log("PROD AUTH_URL:", process.env.AUTH_URL);

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
