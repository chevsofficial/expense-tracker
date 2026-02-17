const benefits = [
  "Build awareness without guilt",
  "Plan spending, don’t block it",
  "Stay consistent with a clean, simple flow",
  "See trends early and adjust confidently",
];

export function Benefits() {
  return (
    <section id="benefits" className="bg-base-200/40 py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-start">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Why Spendary</h2>
          <p className="mt-4 text-lg text-base-content/70">
            Spendary is designed to help you build healthier money habits with less friction and more clarity.
          </p>
        </div>
        <div className="space-y-4">
          {benefits.map((benefit) => (
            <p key={benefit} className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-100 p-4">
              <span className="mt-1 text-primary">✓</span>
              <span>{benefit}</span>
            </p>
          ))}
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
            <p className="font-semibold text-primary">Mindful reminder</p>
            <p className="mt-1 text-base-content/80">Budgets in Spendary are informative, not restrictive. You stay in control.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
