import Link from "next/link";

export function FinalCTA({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl bg-gradient-to-r from-primary to-secondary p-8 text-primary-content md:p-12">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Start tracking today</h2>
          <p className="mt-3 max-w-2xl text-primary-content/85">Build better money awareness with a diary-like experience that keeps budgeting simple and sustainable.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={isAuthenticated ? "/app/dashboard" : "/signup"} className="btn border-transparent bg-base-100 text-base-content hover:opacity-90">
              {isAuthenticated ? "Go to Dashboard" : "Create account"}
            </Link>
            {!isAuthenticated && (
              <Link href="/login" className="btn btn-outline border-primary-content text-primary-content hover:bg-primary-content hover:text-primary">
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
