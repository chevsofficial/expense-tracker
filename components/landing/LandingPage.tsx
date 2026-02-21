import Link from "next/link";
import { Benefits } from "./Benefits";
import { FAQ } from "./FAQ";
import { Features } from "./Features";
import { FinalCTA } from "./FinalCTA";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingHeader } from "./LandingHeader";
import { SocialProof } from "./SocialProof";

export function LandingPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <main data-theme="spendaryDark" className="bg-base-100 text-base-content">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <Hero isAuthenticated={isAuthenticated} />
      <SocialProof />
      <Features />
      <Benefits />
      <HowItWorks />
      <FinalCTA isAuthenticated={isAuthenticated} />
      <FAQ />

      <footer className="border-t border-base-300 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-base-content/70 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Spendary. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
            <a href="mailto:support@spendary.app" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
