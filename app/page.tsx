import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { LandingPage } from "@/components/landing/LandingPage";
import { authOptions } from "@/src/server/auth";

export const metadata: Metadata = {
  title: "Spendary — Expense tracking that feels like a diary",
  description:
    "Track expenses mindfully with categories, monthly planning, and clear insights that help you build better money habits.",
  openGraph: {
    title: "Spendary — Expense tracking that feels like a diary",
    description:
      "Track expenses mindfully with categories, monthly planning, and clear insights that help you build better money habits.",
    type: "website",
    url: "https://www.spendary.app/",
  },
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  return <LandingPage isAuthenticated={Boolean(session)} />;
}
