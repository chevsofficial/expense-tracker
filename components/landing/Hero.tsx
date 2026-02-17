import Link from "next/link";
import { Reveal, stagger } from "./motion";

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const primaryHref = isAuthenticated ? "/app/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Go to dashboard" : "Create your free account";

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 md:grid-cols-2 md:items-center md:py-24">
      <Reveal delay={0}>
        <p className="mb-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Mindful money management
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-base-content md:text-6xl">
          Track spending like a diary. Plan your month with clarity.
        </h1>
        <p className="mt-5 text-lg text-base-content/70">
          Spendary helps you capture expenses in seconds, understand where your money goes, and stay mindful—without feeling restricted.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={primaryHref} className="btn btn-primary">
            {primaryLabel}
          </Link>
          <a href="#features" className="btn btn-outline">
            View dashboard demo
          </a>
        </div>
      </Reveal>

      <Reveal delay={stagger.medium} className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 via-base-100 to-base-100 p-4 shadow-xl">
        <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">February snapshot</h2>
            <span className="rounded-full bg-primary/15 px-2 py-1 text-xs text-primary">On track</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-base-200 p-3">
              <p className="text-base-content/60">Total spent</p>
              <p className="text-xl font-bold">$1,240.80</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-base-200 p-3">
                <p className="text-base-content/60">Top category</p>
                <p className="font-semibold">Food & Dining</p>
              </div>
              <div className="rounded-xl bg-base-200 p-3">
                <p className="text-base-content/60">Budget used</p>
                <p className="font-semibold">68%</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-base-300">
              <div className="h-2 w-2/3 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
