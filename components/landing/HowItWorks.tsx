const steps = [
  ["1", "Create categories", "Use defaults or customize categories for your spending style."],
  ["2", "Add transactions", "Capture expenses in seconds as they happen."],
  ["3", "Review insights", "Check monthly plan progress and category trends."],
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">How it works</h2>
      <div className="relative mt-10 grid gap-5 md:grid-cols-3">
        <div className="pointer-events-none absolute left-20 right-20 top-8 hidden border-t border-dashed border-primary/30 md:block" />
        {steps.map(([num, title, body]) => (
          <article key={num} className="relative rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">{num}</span>
            <h3 className="mt-4 text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-base-content/70">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
